#!/bin/bash
# Extended access test suite.
# Self-checking assertions for the support console, institution catalogues,
# audit log, notifications, and platform-admin functions added in migration
# 20261017000002.
#
# Usage:
#   PGPASSWORD=x bash supabase/tests/extended_access_test.sh
#
# Env vars (with defaults):
#   PGHOST=localhost  PGPORT=5432  PGUSER=tester  PGDATABASE=gss
#   PGPASSWORD must be set by the caller.
#
# Exits non-zero if any assertion fails.
set -u

# Compute repo root from script location (portable from any cwd).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Source shared helpers (sets up $P, run_as, run_raw, assert_*).
. "$SCRIPT_DIR/test_helpers.sh"

# ---------------------------------------------------------------------------
# Reset database.
# ---------------------------------------------------------------------------
dropdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" --if-exists "$PGDATABASE" 2>/dev/null || true
createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -O "$PGUSER" "$PGDATABASE"

# Apply auth stub.
$P -f supabase/tests/local_auth_stub.sql >/dev/null 2>&1

# Apply migrations in order.
for f in supabase/migrations/*.sql; do
  if ! $P -v ON_ERROR_STOP=1 -f "$f" >"${TMPDIR:-/tmp}/mig.log" 2>&1; then
    echo "MIGRATION FAILED: $f"
    grep -m3 -i error "${TMPDIR:-/tmp}/mig.log"
    exit 1
  fi
done
echo "setup: all migrations applied"

# ---------------------------------------------------------------------------
# Seed: same users + institution + enrollment + transactions as the
# guardian test, plus support_agent/support_lead grants and an
# enrollment_verification_request so case 41 has data.
# ---------------------------------------------------------------------------
$P -v ON_ERROR_STOP=1 <<'SQL' || { echo "SEED FAILED"; exit 1; }
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','student@test','{"display_name":"Amina Juma"}'),
 ('22222222-2222-2222-2222-222222222222','guardian@test','{}'),
 ('33333333-3333-3333-3333-333333333333','stranger@test','{}'),
 ('44444444-4444-4444-4444-444444444444','admin@test','{}'),
 ('55555555-5555-5555-5555-555555555555','instadmin@test','{}'),
 ('66666666-6666-6666-6666-666666666666','support@test','{}');
insert into public.institutions(id,name,country_code,verification_status) values ('99999999-9999-9999-9999-999999999999','Test University','TZ','verified');
insert into public.student_enrollments(student_id,institution_id,admission_number,verification_status)
 values ('11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999','ADM-1','verified');
insert into public.user_role_assignments(user_id,role,institution_id) values
 ('44444444-4444-4444-4444-444444444444','platform_admin',null),
 ('55555555-5555-5555-5555-555555555555','institution_admin','99999999-9999-9999-9999-999999999999')
 on conflict do nothing;
insert into public.user_role_assignments(user_id,role) values
 ('22222222-2222-2222-2222-222222222222','parent_guardian'),
 ('33333333-3333-3333-3333-333333333333','support_agent'),
 ('66666666-6666-6666-6666-666666666666','support_lead')
 on conflict do nothing;
insert into public.gss_transactions(reference,student_id,institution_id,amount_minor,currency_code,transaction_type,status,description) values
 ('TX-1','11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999',50000,'TZS','tuition','completed','Term 1 tuition'),
 ('TX-2','11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999',10000,'TZS','fees','pending','Lab fee');
-- Seed an enrollment_verification_request so case 39 has data.
insert into public.enrollment_verification_requests(enrollment_id,student_id,institution_id,status)
 select e.id, e.student_id, e.institution_id, 'pending'::text
 from public.student_enrollments e
 where e.student_id='11111111-1111-1111-1111-111111111111' and e.institution_id='99999999-9999-9999-9999-999999999999'
 on conflict do nothing;
-- The signup trigger gives every auth user the student role. For cases 2 and 5
-- to test non-student denial, remove the student role from G and X. This does
-- not change application behaviour — it only sets up the test fixture.
delete from public.user_role_assignments where user_id in ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333') and role='student';
SQL
echo "setup: seed ok"

# ---------------------------------------------------------------------------
# Constants.
# ---------------------------------------------------------------------------
S=11111111-1111-1111-1111-111111111111
G=22222222-2222-2222-2222-222222222222
X=33333333-3333-3333-3333-333333333333
A=44444444-4444-4444-4444-444444444444
I=55555555-5555-5555-5555-555555555555
SA=66666666-6666-6666-6666-666666666666

# ---------------------------------------------------------------------------
# Support case lifecycle (1-9)
# ---------------------------------------------------------------------------

OUT=$(run_as "$S" "select public.gss_student_open_support_case('Tuition double charge','I was charged twice for tuition last week and need help.',null,'high');")
assert_uuid "1 student opens support case" "$OUT"
CASE_ID=$(echo "$OUT" | grep -E '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' | tail -1)

OUT=$(run_as "$G" "select public.gss_student_open_support_case('Should fail','This should not work because the caller is not a student.',null,'normal');")
assert_denied "2 non-student denied opening case" "Not authorized" "$OUT"

OUT=$(run_raw "select public.gss_student_open_support_case('No auth','This should fail.',null,'normal');")
assert_denied "3 unauthenticated denied opening case" "Authentication required" "$OUT"

OUT=$(run_as "$S" "select count(*) from public.gss_student_support_cases();")
assert_count "4 student lists own cases" eq 1 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_student_support_cases();")
assert_count "5 stranger lists 0 own cases" eq 0 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_support_list_cases(null,null);")
# support_agent sees all cases. After case 1, there is exactly 1 case.
assert_count "6 support_agent lists all cases" eq 1 "$OUT"

OUT=$(run_as "$S" "select public.gss_student_add_support_note('$CASE_ID','Here is the transaction reference: TX-1.');")
assert_ok "7 student adds note to own case" "$OUT"

OUT=$(run_as "$X" "select public.gss_student_add_support_note('$CASE_ID','I should not be able to add a note here.');")
assert_denied "8 stranger denied note on other's case" "Case not found or closed" "$OUT"

OUT=$(run_as "$S" "select public.gss_student_close_support_case('$CASE_ID');")
assert_ok "9 student closes own case" "$OUT"

# Reopen for the refund flow.
$P -c "update public.support_cases set status='open' where id='$CASE_ID'" >/dev/null

# ---------------------------------------------------------------------------
# Refund flow (10-18)
# ---------------------------------------------------------------------------

TX_ID=$($P -tAc "select id from public.gss_transactions where reference='TX-1'")

OUT=$(run_as "$X" "select public.gss_support_request_refund('$CASE_ID','$TX_ID',30000,'TZS','Customer reported duplicate charge; partial refund approved.');")
assert_denied "10 support_agent denied refund request" "Not authorized" "$OUT"

OUT=$(run_as "$SA" "select public.gss_support_request_refund('$CASE_ID','$TX_ID',30000,'TZS','Customer reported duplicate charge; partial refund approved per policy.');")
assert_uuid "11 support_lead requests refund" "$OUT"
RID=$(echo "$OUT" | grep -E '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' | tail -1)

# Create a second case owned by a different student to test cross-owner denial.
$P -c "insert into public.support_cases(student_id,subject,description,status,priority) values ('22222222-2222-2222-2222-222222222222','Other case','Other case description here','open','normal')" >/dev/null
OTHER_CASE=$($P -tAc "select id from public.support_cases where student_id='22222222-2222-2222-2222-222222222222' limit 1")

OUT=$(run_as "$SA" "select public.gss_support_request_refund('$OTHER_CASE','$TX_ID',5000,'TZS','Should fail because TX-1 does not belong to this case owner.');")
assert_denied "12 refund on wrong-owner transaction denied" "Transaction does not belong" "$OUT"

OUT=$(run_as "$X" "select public.gss_admin_decide_refund('$RID','approved','Should fail because support_agent is not platform_admin.');")
assert_denied "13 support_agent denied refund decision" "Not authorized" "$OUT"

OUT=$(run_as "$A" "select public.gss_admin_decide_refund('$RID','approved','Partial refund of 30000 TZS approved based on case review.');")
assert_ok "14 platform_admin approves refund" "$OUT"

OUT=$(run_as "$A" "select public.gss_admin_decide_refund('$RID','approved','Should fail because already approved.');")
assert_denied "15 re-approve denied" "Refund already decided" "$OUT"

OUT=$(run_as "$A" "select public.gss_admin_decide_refund('$RID','processed','Refund processed via bank batch REF-BATCH-1.');")
assert_ok "16 platform_admin marks refund processed" "$OUT"

OUT=$(run_as "$A" "select public.gss_admin_decide_refund('$RID','processed','Should fail.');")
assert_denied "17 re-process denied" "Refund already processed" "$OUT"

OUT=$(run_as "$A" "select count(*) from public.support_refund_audit where refund_request_id='$RID';")
assert_count "18 refund audit log has 2 rows" eq 2 "$OUT"

# ---------------------------------------------------------------------------
# Refund reads (19-20)
# ---------------------------------------------------------------------------

OUT=$(run_as "$S" "select count(*) from public.gss_student_refund_requests();")
assert_count "19 student reads own refund requests" eq 1 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_student_refund_requests();")
assert_count "20 stranger reads 0 refund requests" eq 0 "$OUT"

# ---------------------------------------------------------------------------
# Notifications (21-23)
# ---------------------------------------------------------------------------

OUT=$(run_as "$S" "select count(*) from public.gss_list_notifications(50);")
assert_count "21 student has notifications" ge 1 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_list_notifications(50);")
assert_count "22 stranger has 0 notifications" eq 0 "$OUT"

OUT=$(run_raw "select count(*) from public.gss_list_notifications(10);")
# gss_list_notifications filters by user_id = auth.uid(). For unauthenticated
# callers auth.uid() is null, so the filter matches 0 rows. No error is raised;
# no data is leaked. This is safe behaviour, just a different pattern from the
# write functions that explicitly raise 'Authentication required'.
assert_count "23 unauthenticated sees 0 notifications" eq 0 "$OUT"

# ---------------------------------------------------------------------------
# Institution catalogues (24-34)
# ---------------------------------------------------------------------------

OUT=$(run_as "$I" "select count(*) from public.gss_institution_list_catalogues();")
assert_count "24 institution admin lists 0 catalogues initially" eq 0 "$OUT"

OUT=$(run_as "$I" "select public.gss_institution_upsert_programme(null,'Bachelor of Science','BSC');")
assert_uuid "25 institution admin creates programme" "$OUT"
PROG_ID=$(echo "$OUT" | grep -E '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' | tail -1)

OUT=$(run_as "$X" "select public.gss_institution_upsert_programme(null,'Should fail','FAIL');")
assert_denied "26 non-institution-admin denied programme creation" "Institution admin required" "$OUT"

OUT=$(run_as "$I" "select public.gss_institution_upsert_department(null,'Computer Science');")
assert_uuid "27 institution admin creates department" "$OUT"
DEPT_ID=$(echo "$OUT" | grep -E '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' | tail -1)

OUT=$(run_as "$I" "select public.gss_institution_upsert_academic_year(null,'2026/2027',true);")
assert_uuid "28 institution admin creates academic year" "$OUT"

OUT=$(run_as "$I" "select public.gss_institution_upsert_tuition_fee(null,'Tuition 2026/2027',500000,'TZS',null,null);")
assert_uuid "29 institution admin creates tuition fee" "$OUT"

OUT=$(run_as "$I" "select count(*) from public.gss_institution_list_catalogues();")
assert_count "30 institution admin lists 4 catalogues" eq 4 "$OUT"

OUT=$(run_as "$I" "select public.gss_institution_delete_programme('$PROG_ID');")
assert_ok "31 institution admin deletes programme" "$OUT"

OUT=$(run_as "$X" "select public.gss_institution_delete_department('$DEPT_ID');")
assert_denied "32 stranger denied deleting department" "Institution admin required" "$OUT"

OUT=$(run_as "$I" "select count(*) from public.gss_institution_catalogue_audit_log(100);")
assert_count "33 institution admin reads catalogue audit log" ge 4 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_institution_catalogue_audit_log(100);")
assert_count "34 non-institution-admin reads 0 audit rows" eq 0 "$OUT"

# ---------------------------------------------------------------------------
# Platform admin functions (35-45)
# ---------------------------------------------------------------------------

OUT=$(run_as "$A" "select count(*) from public.gss_admin_list_students(null,100);")
assert_count "35 platform admin lists students" ge 1 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_admin_list_students(null,100);")
assert_count "36 non-admin lists 0 students" eq 0 "$OUT"

OUT=$(run_as "$A" "select count(*) from public.gss_admin_list_institutions(null,null);")
assert_count "37 platform admin lists institutions" ge 1 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_admin_list_institutions(null,null);")
assert_count "38 non-admin lists 0 institutions" eq 0 "$OUT"

OUT=$(run_as "$A" "select count(*) from public.gss_admin_verification_monitoring(null);")
# Seeded an enrollment_verification_requests row in the seed block.
assert_count "39 platform admin verification monitoring" ge 1 "$OUT"

OUT=$(run_as "$A" "select count(*) from public.gss_admin_audit_log(500);")
assert_count "40 platform admin audit log has entries" ge 1 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_admin_audit_log(500);")
assert_count "41 non-admin audit log is 0" eq 0 "$OUT"

OUT=$(run_as "$A" "select public.gss_admin_platform_analytics() is not null as ok;")
# The query returns 't' if not null. Assert that the last line is 't'.
assert_contains "42 platform admin analytics returns json" "t" "$OUT"

OUT=$(run_as "$X" "select public.gss_admin_platform_analytics() is null as denied;")
assert_null "43 non-admin analytics returns null" "$OUT"

OUT=$(run_as "$A" "select count(*) from public.gss_admin_list_countries();")
assert_count "44 platform admin lists countries" ge 1 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_admin_list_countries();")
assert_count "45 non-admin lists 0 countries" eq 0 "$OUT"

# ---------------------------------------------------------------------------
# Direct write denials (46-49)
# ---------------------------------------------------------------------------

OUT=$(run_as "$X" "insert into public.support_cases(student_id,subject,description) values ('$S','Direct insert','Should fail because no client insert grant.');")
assert_denied "46 support_agent cannot insert support_cases" "permission denied" "$OUT"

OUT=$(run_as "$X" "insert into public.support_refund_requests(case_id,transaction_id,student_id,amount_minor,currency_code,reason,created_by) values ('$CASE_ID','$TX_ID','$S',100,'TZS','Direct insert should fail','$SA');")
assert_denied "47 support_agent cannot insert refund_requests" "permission denied" "$OUT"

OUT=$(run_as "$S" "insert into public.notifications(user_id,title) values ('$S','Direct insert should fail');")
assert_denied "48 student cannot insert notifications" "permission denied" "$OUT"

OUT=$(run_as "$I" "insert into public.institution_programmes(institution_id,name) values ('99999999-9999-9999-9999-999999999999','Direct insert should fail');")
assert_denied "49 institution admin cannot insert programmes directly" "permission denied" "$OUT"

# ---------------------------------------------------------------------------
# Direct read denials (50-51)
# ---------------------------------------------------------------------------

OUT=$(run_as "$I" "select count(*) from public.institution_admin_audit;")
assert_count "50 institution admin reads 0 admin_audit rows" eq 0 "$OUT"

OUT=$(run_as "$I" "select count(*) from public.support_refund_audit;")
assert_count "51 institution admin reads 0 refund_audit rows" eq 0 "$OUT"

# ---------------------------------------------------------------------------
# institution_staff cannot be granted (52)
# ---------------------------------------------------------------------------

OUT=$(run_raw "insert into public.user_role_assignments(user_id,role) values ('$X','institution_staff') returning user_id,role;")
assert_denied "52 institution_staff cannot be inserted" "check constraint" "$OUT"

# ---------------------------------------------------------------------------
# Cross-institution isolation (53)
# ---------------------------------------------------------------------------

# Create a second institution + admin owned by a different user.
$P -c "insert into public.institutions(id,name,country_code,verification_status) values ('88888888-8888-8888-8888-888888888888','Other University','TZ','verified') on conflict do nothing;" >/dev/null
$P -c "insert into public.user_role_assignments(user_id,role,institution_id) values ('33333333-3333-3333-3333-333333333333','institution_admin','88888888-8888-8888-8888-888888888888') on conflict do nothing;" >/dev/null
$P -c "insert into public.student_enrollments(student_id,institution_id,admission_number) values ('11111111-1111-1111-1111-111111111111','88888888-8888-8888-8888-888888888888','ADM-OTHER') on conflict do nothing;" >/dev/null

# Institution admin I (Test University) should see only Test University enrollments.
OUT=$(run_as "$I" "select count(*) from public.gss_institution_student_directory();")
assert_count "53 institution admin directory count is own only" eq 1 "$OUT"

OUT=$(run_as "$I" "select i.name from public.gss_institution_student_directory() d join public.student_enrollments e on e.id = d.enrollment_id join public.institutions i on i.id = e.institution_id limit 1;")
assert_contains "53 institution admin directory name is Test University" "Test University" "$OUT"

# ---------------------------------------------------------------------------
# Institution admin cannot approve applications (54)
# ---------------------------------------------------------------------------

APP_ID=$($P -tAc "insert into public.institution_applications(institution_name,country_code,contact_email,status) values ('Fraud University','TZ','fraud@test','pending') returning id")
OUT=$(run_as "$I" "select public.gss_review_institution('$APP_ID','reviewing','Institution admin should not be able to review.');")
assert_denied "54 institution admin cannot approve applications" "Not authorized" "$OUT"

print_summary
