#!/bin/bash
# Extended SQL test harness for the new support, catalogue, audit and
# notification functions added in migration 20261017000002.
#
# Mirrors the structure of guardian_access_test.sh. Uses the same local
# PostgreSQL (tester superuser, password x, database gss) and the same
# auth stub. Re-applies all migrations so it is independent of the
# guardian test's state.
#
# Run: bash supabase/tests/extended_access_test.sh
set -u
export PGROOT=${PGROOT:-/home/z/my-project/pgroot/usr/lib/postgresql/17}
export PATH=$PGROOT/bin:$PATH
export LD_LIBRARY_PATH=${LD_LIBRARY_PATH:-}:/home/z/my-project/pgroot/usr/lib/x86_64-linux-gnu:/home/z/my-project/pgroot/usr/lib
export PGPASSWORD=x

# cd to the repo root (the directory above supabase/tests/).
cd "$(cd "$(dirname "$0")/../.." && pwd)"

# Drop & recreate gss as tester.
dropdb -h localhost -p 5433 -U tester --if-exists gss
createdb -h localhost -p 5433 -U tester -O tester gss

P="psql -X -q -h localhost -p 5433 -U tester -d gss"
$P -f supabase/tests/local_auth_stub.sql >/dev/null 2>&1 || { echo "STUB FAILED"; exit 1; }

for f in supabase/migrations/*.sql; do
  if ! $P -v ON_ERROR_STOP=1 -f "$f" >"${TMPDIR:-/tmp}/mig.log" 2>&1; then
    echo "MIGRATION FAILED: $f"
    grep -m3 -i error "${TMPDIR:-/tmp}/mig.log"
    exit 1
  fi
done
echo "all migrations applied"

# Seed: same users + institution + enrollment + transactions as the
# guardian test, plus institution_admin and support_agent/support_lead
# grants on the admin user and a separate stranger user for support_agent.
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
SQL
echo "seed ok"

S=11111111-1111-1111-1111-111111111111
G=22222222-2222-2222-2222-222222222222
X=33333333-3333-3333-3333-333333333333
A=44444444-4444-4444-4444-444444444444
I=55555555-5555-5555-5555-555555555555
SA=66666666-6666-6666-6666-666666666666

as_user() { # as_user <uid> <sql>
  $P -v ON_ERROR_STOP=0 <<SQL 2>&1 | grep -v "set_config\|^---\|^ *[0-9a-f-]\{36\} *$\|^(1 row)\|^$\|^-*+*-*$"
set role authenticated;
select set_config('request.jwt.claim.sub','$1',false);
$2
SQL
}

# as_user_capture — like as_user but returns only the function result (last non-empty line).
# Skips the set_config output line. Uses -tA (tuples only, no padding).
as_user_capture() { # as_user_capture <uid> <sql>
  $P -tA -v ON_ERROR_STOP=0 <<SQL 2>&1 | grep -v "^$1$" | tail -1
set role authenticated;
select set_config('request.jwt.claim.sub','$1',false);
$2
SQL
}

t(){ echo; echo "### $1"; }

# ---------- support case lifecycle ----------
t "1 student opens a support case (expect: uuid)"
CASE_ID=$(as_user_capture $S "select public.gss_student_open_support_case('Tuition double charge','I was charged twice for tuition last week and need help.',null,'high')" | tr -d ' \n')
echo "case_id=$CASE_ID"

t "2 non-student (guardian) tries to open a case (expect: Not authorized)"
as_user $G "select public.gss_student_open_support_case('Should fail','This should not work because the caller is not a student.',null,'normal');"

t "3 unauthenticated tries to open a case (expect: Authentication required)"
$P -v ON_ERROR_STOP=0 -c "select public.gss_student_open_support_case('No auth','This should fail.',null,'normal');" 2>&1 | tail -2

t "4 student lists own cases (expect: 1 row)"
as_user $S "select count(*) from public.gss_student_support_cases();"

t "5 stranger (not the owner) lists cases (expect: 0 rows)"
as_user $X "select count(*) from public.gss_student_support_cases();"

t "6 support_agent lists cases (expect: 1 row)"
as_user $X "select count(*) from public.gss_support_list_cases(null,null);"

t "7 student adds a note to own case (expect: success)"
as_user $S "select public.gss_student_add_support_note('$CASE_ID','Here is the transaction reference: TX-1.');"

t "8 stranger tries to add a note to someone else's case (expect: Case not found)"
as_user $X "select public.gss_student_add_support_note('$CASE_ID','I should not be able to add a note here.');"

t "9 student closes own case (expect: success)"
as_user $S "select public.gss_student_close_support_case('$CASE_ID');"

# Reopen for the refund flow
$P -c "update public.support_cases set status='open' where id='$CASE_ID'" >/dev/null

# ---------- refund flow ----------
t "10 support_agent tries to request refund (expect: Not authorized)"
TX_ID=$($P -tAc "select id from public.gss_transactions where reference='TX-1'")
as_user $X "select public.gss_support_request_refund('$CASE_ID','$TX_ID',30000,'TZS','Customer reported duplicate charge; partial refund approved.');"

t "11 support_lead requests refund (expect: uuid)"
RID=$(as_user_capture $SA "select public.gss_support_request_refund('$CASE_ID','$TX_ID',30000,'TZS','Customer reported duplicate charge; partial refund approved per policy.')" | tr -d ' \n')
echo "refund_id=$RID"

t "12 support_lead tries refund on transaction not owned by case owner (expect: Transaction does not belong)"
# Create a second case owned by a different student (use guardian as a student surrogate via direct insert)
$P -c "insert into public.support_cases(student_id,subject,description,status,priority) values ('22222222-2222-2222-2222-222222222222','Other case','Other case description here','open','normal') returning id;" >/dev/null
OTHER_CASE=$($P -tAc "select id from public.support_cases where student_id='22222222-2222-2222-2222-222222222222' limit 1")
as_user $SA "select public.gss_support_request_refund('$OTHER_CASE','$TX_ID',5000,'TZS','Should fail because TX-1 does not belong to this case owner.');"

t "13 support_agent tries to decide refund (expect: Not authorized)"
as_user $X "select public.gss_admin_decide_refund('$RID','approved','Should fail because support_agent is not platform_admin.');"

t "14 platform_admin approves refund (expect: success)"
as_user $A "select public.gss_admin_decide_refund('$RID','approved','Partial refund of 30000 TZS approved based on case review.');"

t "15 platform_admin tries to approve same refund again (expect: Refund already decided)"
as_user $A "select public.gss_admin_decide_refund('$RID','approved','Should fail because already approved.');"

t "16 platform_admin marks refund processed (expect: success)"
as_user $A "select public.gss_admin_decide_refund('$RID','processed','Refund processed via bank batch REF-BATCH-1.');"

t "17 platform_admin tries to process already-processed refund (expect: Refund already processed)"
as_user $A "select public.gss_admin_decide_refund('$RID','processed','Should fail.');"

t "18 refund audit log exists (expect: 2 rows: pending->approved, approved->processed)"
as_user $A "select previous_status || ' -> ' || new_status from public.support_refund_audit where refund_request_id='$RID' order by created_at;"

t "19 student reads own refund requests (expect: 1 row)"
as_user $S "select count(*) from public.gss_student_refund_requests();"

t "20 stranger reads refund requests (expect: 0 rows)"
as_user $X "select count(*) from public.gss_student_refund_requests();"

# ---------- notifications ----------
t "21 student has notifications (expect: >=1 from case open + refund decision)"
as_user $S "select count(*) from public.gss_list_notifications(50);"

t "22 stranger has no notifications (expect: 0 rows)"
as_user $X "select count(*) from public.gss_list_notifications(50);"

t "23 unauthenticated denied notifications (expect: Authentication required)"
$P -v ON_ERROR_STOP=0 -c "select * from public.gss_list_notifications(10);" 2>&1 | tail -2

# ---------- institution catalogues ----------
t "24 institution admin lists catalogues (expect: 0 rows initially)"
as_user $I "select count(*) from public.gss_institution_list_catalogues();"

t "25 institution admin creates a programme (expect: uuid)"
PROG_ID=$(as_user_capture $I "select public.gss_institution_upsert_programme(null,'Bachelor of Science','BSC')" | tr -d ' \n')
echo "prog_id=$PROG_ID"

t "26 non-institution-admin tries to create a programme (expect: Institution admin required)"
as_user $X "select public.gss_institution_upsert_programme(null,'Should fail','FAIL');"

t "27 institution admin creates a department (expect: uuid)"
DEPT_ID=$(as_user_capture $I "select public.gss_institution_upsert_department(null,'Computer Science')" | tr -d ' \n')
echo "dept_id=$DEPT_ID"

t "28 institution admin creates an academic year (expect: uuid)"
AY_ID=$(as_user_capture $I "select public.gss_institution_upsert_academic_year(null,'2026/2027',true)" | tr -d ' \n')
echo "ay_id=$AY_ID"

t "29 institution admin creates a tuition fee (expect: uuid)"
TF_ID=$(as_user_capture $I "select public.gss_institution_upsert_tuition_fee(null,'Tuition 2026/2027',500000,'TZS',null,null)" | tr -d ' \n')
echo "tf_id=$TF_ID"

t "30 institution admin lists catalogues (expect: 4 rows: programme, department, academic_year, tuition_fee)"
as_user $I "select kind from public.gss_institution_list_catalogues() order by kind;"

t "31 institution admin deletes a programme (expect: success)"
as_user $I "select public.gss_institution_delete_programme('$PROG_ID');"

t "32 stranger tries to delete a department (expect: Department not found)"
as_user $X "select public.gss_institution_delete_department('$DEPT_ID');"

t "33 institution admin reads catalogue audit log (expect: >=4 rows)"
as_user $I "select count(*) from public.gss_institution_catalogue_audit_log(100);"

t "34 non-institution-admin reads catalogue audit log (expect: 0 rows)"
as_user $X "select count(*) from public.gss_institution_catalogue_audit_log(100);"

# ---------- institution staff listing ----------
t "35 institution admin reads staff listing (expect: 1 row — themselves)"
as_user $I "select count(*) from public.gss_institution_staff_listing();"

t "36 non-institution-admin reads staff listing (expect: 0 rows)"
as_user $X "select count(*) from public.gss_institution_staff_listing();"

# ---------- platform admin functions ----------
t "37 platform admin lists students (expect: >=1)"
as_user $A "select count(*) from public.gss_admin_list_students(null,100);"

t "38 non-admin lists students (expect: 0 rows)"
as_user $X "select count(*) from public.gss_admin_list_students(null,100);"

t "39 platform admin lists institutions (expect: >=1)"
as_user $A "select count(*) from public.gss_admin_list_institutions(null,null);"

t "40 non-admin lists institutions (expect: 0 rows)"
as_user $X "select count(*) from public.gss_admin_list_institutions(null,null);"

t "41 platform admin verification monitoring (expect: >=1)"
as_user $A "select count(*) from public.gss_admin_verification_monitoring(null);"

t "42 platform admin audit log (expect: >=1 — includes refund decision)"
as_user $A "select count(*) from public.gss_admin_audit_log(500);"

t "43 non-admin audit log (expect: 0 rows)"
as_user $X "select count(*) from public.gss_admin_audit_log(500);"

t "44 platform admin platform analytics (expect: json)"
as_user $A "select public.gss_admin_platform_analytics() is not null as ok;"

t "45 non-admin platform analytics (expect: null)"
as_user $X "select public.gss_admin_platform_analytics() is null as denied;"

t "46 platform admin list countries (expect: >0)"
as_user $A "select count(*) from public.gss_admin_list_countries();"

t "47 non-admin list countries (expect: 0 rows)"
as_user $X "select count(*) from public.gss_admin_list_countries();"

# ---------- direct write denials ----------
t "48 support_agent direct-insert into support_cases (expect: permission denied)"
as_user $X "insert into public.support_cases(student_id,subject,description) values ('$S','Direct insert','Should fail because no client insert grant.');"

t "49 support_agent direct-insert into support_refund_requests (expect: permission denied)"
as_user $X "insert into public.support_refund_requests(case_id,transaction_id,student_id,amount_minor,currency_code,reason,created_by) values ('$CASE_ID','$TX_ID','$S',100,'TZS','Direct insert should fail','$SA');"

t "50 student direct-insert into notifications (expect: permission denied)"
as_user $S "insert into public.notifications(user_id,title) values ('$S','Direct insert should fail');"

t "51 institution admin direct-insert into institution_programmes (expect: permission denied)"
as_user $I "insert into public.institution_programmes(institution_id,name) values ('99999999-9999-9999-9999-999999999999','Direct insert should fail');"

t "52 institution admin direct-read institution_admin_audit (expect: 0 rows, no policy)"
as_user $I "select count(*) from public.institution_admin_audit;"

t "53 institution admin direct-read support_refund_audit (expect: 0 rows, no policy)"
as_user $I "select count(*) from public.support_refund_audit;"

# ---------- institution_staff cannot be granted by any function ----------
t "54 institution_staff cannot be inserted (expect: check constraint violation)"
$P -v ON_ERROR_STOP=0 -c "insert into public.user_role_assignments(user_id,role) values ('$X','institution_staff') returning user_id,role;" 2>&1 | tail -3

t "55 institution admin cannot touch another institution's data (expect: 0 rows from directory)"
# Create a second institution + admin owned by a different user; the first admin should see only their own
$P -c "insert into public.institutions(id,name,country_code,verification_status) values ('88888888-8888-8888-8888-888888888888','Other University','TZ','verified') on conflict do nothing;" >/dev/null
$P -c "insert into public.user_role_assignments(user_id,role,institution_id) values ('33333333-3333-3333-3333-333333333333','institution_admin','88888888-8888-8888-8888-888888888888') on conflict do nothing;" >/dev/null
$P -c "insert into public.student_enrollments(student_id,institution_id,admission_number) values ('11111111-1111-1111-1111-111111111111','88888888-8888-8888-8888-888888888888','ADM-OTHER') on conflict do nothing;" >/dev/null
# Institution admin I (Test University) should see only Test University enrollments, not Other University
as_user $I "select count(*) from public.gss_institution_student_directory();"
echo "(expect 1 row — only Test University enrollments)"

t "56 institution admin cannot approve institution applications (expect: only platform_admin can call gss_review_institution)"
# Insert a pending application
APP_ID=$($P -tAc "insert into public.institution_applications(institution_name,country_code,contact_email,status) values ('Fraud University','TZ','fraud@test','pending') returning id")
as_user $I "select public.gss_review_institution('$APP_ID','reviewing','Institution admin should not be able to review.');"

echo
echo "=== extended test complete ==="
