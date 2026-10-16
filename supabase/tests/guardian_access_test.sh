#!/bin/bash
# Guardian access test suite.
# Applies every migration to a local PostgreSQL with the Supabase auth stub,
# then runs self-checking assertions for the guardian, institution-finance,
# and platform-admin access controls.
#
# Usage:
#   PGPASSWORD=x bash supabase/tests/guardian_access_test.sh
#
# Env vars (with defaults):
#   PGHOST=localhost  PGPORT=5432  PGUSER=tester  PGDATABASE=gss_base (default)
#   PGPASSWORD must be set by the caller.
#
# Exits non-zero if any assertion fails.
set -u

# Compute repo root from script location (portable from any cwd).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Source shared helpers (sets up $P, run_as, run_raw, assert_*).
: "${PGDATABASE:=gss_base}"; export PGDATABASE
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
# Seed.
# ---------------------------------------------------------------------------
$P -v ON_ERROR_STOP=1 <<'SQL' || { echo "SEED FAILED"; exit 1; }
insert into auth.users(id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','student@test','{"display_name":"Amina Juma"}'),
 ('22222222-2222-2222-2222-222222222222','guardian@test','{}'),
 ('33333333-3333-3333-3333-333333333333','stranger@test','{}'),
 ('44444444-4444-4444-4444-444444444444','admin@test','{}'),
 ('55555555-5555-5555-5555-555555555555','instadmin@test','{}');
insert into public.institutions(id,name,country_code,verification_status) values ('99999999-9999-9999-9999-999999999999','Test University','TZ','verified');
insert into public.student_enrollments(student_id,institution_id,admission_number,verification_status)
 values ('11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999','ADM-1','verified');
insert into public.user_role_assignments(user_id,role,institution_id) values
 ('44444444-4444-4444-4444-444444444444','platform_admin',null),
 ('55555555-5555-5555-5555-555555555555','institution_admin','99999999-9999-9999-9999-999999999999')
 on conflict do nothing;
insert into public.user_role_assignments(user_id,role) values
 ('22222222-2222-2222-2222-222222222222','parent_guardian'),
 ('33333333-3333-3333-3333-333333333333','parent_guardian')
 on conflict do nothing;
insert into public.gss_transactions(reference,student_id,institution_id,amount_minor,currency_code,transaction_type,status,description) values
 ('TX-1','11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999',50000,'TZS','tuition','completed','Term 1 tuition'),
 ('TX-2','11111111-1111-1111-1111-111111111111','99999999-9999-9999-9999-999999999999',10000,'TZS','fees','pending','Lab fee');
SQL
echo "setup: seed ok"

# ---------------------------------------------------------------------------
# Constants.
# ---------------------------------------------------------------------------
GID=$($P -tAc "select global_student_id from public.student_global_ids where student_id='11111111-1111-1111-1111-111111111111'")
G=22222222-2222-2222-2222-222222222222
S=11111111-1111-1111-1111-111111111111
X=33333333-3333-3333-3333-333333333333
A=44444444-4444-4444-4444-444444444444
I=55555555-5555-5555-5555-555555555555

# ---------------------------------------------------------------------------
# Test cases.
# ---------------------------------------------------------------------------

OUT=$(run_as "$S" "select public.gss_request_guardian_link('$GID','parent');")
assert_denied "A student cannot request guardian link" "Not authorized" "$OUT"

OUT=$(run_as "$G" "select public.gss_request_guardian_link('GSS-9999999999','parent');")
assert_ok "B guardian unknown ID returns no error" "$OUT"

OUT=$(run_as "$G" "select public.gss_request_guardian_link('$GID','parent');")
assert_uuid "C guardian real ID returns uuid" "$OUT"

OUT=$(run_as "$G" "select public.gss_request_guardian_link('$GID','parent');")
assert_ok "D duplicate request returns no error" "$OUT"

LID=$($P -tAc "select id from public.guardian_links where guardian_id='$G'")

OUT=$(run_as "$G" "select count(*) from public.gss_guardian_children();")
assert_count "E pending guardian sees 0 children" eq 0 "$OUT"

OUT=$(run_as "$G" "select count(*) from public.gss_guardian_child_payments('$S');")
assert_count "F pending guardian reads 0 payments" eq 0 "$OUT"

OUT=$(run_as "$X" "select public.gss_student_decide_guardian_link('$LID',true);")
assert_denied "G stranger cannot accept request" "Request not found" "$OUT"

OUT=$(run_as "$S" "select public.gss_student_decide_guardian_link('$LID',true);")
assert_ok "H student accepts request" "$OUT"

OUT=$(run_as "$G" "select count(*) from public.gss_guardian_children();")
assert_count "I guardian sees 1 child" eq 1 "$OUT"

OUT=$(run_as "$G" "select count(*) from public.gss_guardian_child_payments('$S');")
assert_count "J guardian reads 2 payments" eq 2 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_guardian_child_payments('$S');")
assert_count "K unlinked guardian reads 0 payments" eq 0 "$OUT"

OUT=$(run_as "$S" "select public.gss_student_revoke_guardian_link('$LID');")
assert_ok "L student revokes link" "$OUT"

OUT=$(run_as "$G" "select (select count(*) from public.gss_guardian_children()) + (select count(*) from public.gss_guardian_child_payments('$S')) as total;")
assert_count "M guardian after revoke sees 0 total" eq 0 "$OUT"

OUT=$(run_as "$I" "select count(*) from public.gss_institution_finance_summary();")
assert_count "N institution finance summary returns 2 rows" eq 2 "$OUT"

OUT=$(run_as "$S" "select count(*) from public.gss_institution_finance_summary();")
assert_count "O student reads 0 finance rows" eq 0 "$OUT"

OUT=$(run_as "$A" "select public.gss_admin_dashboard_stats();")
assert_json "P platform admin stats returns json" "$OUT"

OUT=$(run_as "$G" "select public.gss_admin_dashboard_stats() is null as denied;")
assert_null "Q guardian reads null admin stats" "$OUT"

OUT=$(run_as "$A" "select public.gss_admin_grant_guardian_role('stranger@test');")
assert_uuid "Q2 platform admin grants guardian role" "$OUT"

OUT=$(run_as "$A" "select count(*) from public.gss_admin_list_role_assignments();")
# After grant: student(1) + 2 guardian(2) + platform_admin(1) + institution_admin(1) = 5
assert_count "R platform admin lists 5 role assignments" ge 5 "$OUT"

OUT=$(run_as "$G" "select public.gss_admin_grant_guardian_role('admin@test');")
assert_denied "Q3 guardian cannot grant role" "Not authorized" "$OUT"

OUT=$(run_as "$G" "insert into public.guardian_links(guardian_id,student_id,relationship,status) values ('$G','$S','parent','active');")
assert_denied "S guardian cannot insert link directly" "permission denied" "$OUT"

OUT=$(run_as "$G" "select count(*) from public.gss_transactions;")
assert_count "T guardian reads 0 transactions directly" eq 0 "$OUT"

OUT=$(run_as "$X" "select count(*) from public.gss_guardian_child_payments('$S');")
assert_count "U student cannot read another's payments" eq 0 "$OUT"

print_summary
