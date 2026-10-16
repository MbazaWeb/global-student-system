#!/bin/bash
set -u
cd "$(git rev-parse --show-toplevel)"
export PGPASSWORD=x
P="psql -X -q -h localhost -U tester -d gss"
# Requires a local PostgreSQL with a superuser "tester" (password x) and database gss.
su postgres -c "dropdb --if-exists gss && createdb -O tester gss"
$P -f supabase/tests/local_auth_stub.sql >/dev/null 2>&1
for f in supabase/migrations/*.sql; do $P -v ON_ERROR_STOP=1 -f "$f" >"${TMPDIR:-/tmp}/mig.log" 2>&1 || { echo "MIGRATION FAILED: $f"; grep -m3 ERROR "${TMPDIR:-/tmp}/mig.log"; exit 1; }; done
echo "all migrations applied"

$P -v ON_ERROR_STOP=1 <<'SQL' || { echo "SEED FAILED"; exit 1; }
-- The signup trigger creates a student profile, global ID and student role for every new auth user.
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
echo "seed ok"

as_user() { # as_user <uid> <sql>
  $P -v ON_ERROR_STOP=0 <<SQL 2>&1 | grep -v "set_config\|^---\|^ *[0-9a-f-]\{36\} *$\|^(1 row)\|^$\|^-*+*-*$" 
set role authenticated;
select set_config('request.jwt.claim.sub','$1',false);
$2
SQL
}
GID=$($P -tAc "select global_student_id from public.student_global_ids where student_id='11111111-1111-1111-1111-111111111111'")
G=22222222-2222-2222-2222-222222222222; S=11111111-1111-1111-1111-111111111111; X=33333333-3333-3333-3333-333333333333
A=44444444-4444-4444-4444-444444444444; I=55555555-5555-5555-5555-555555555555

t(){ echo; echo "### $1"; }
t "A student requests a link as a guardian (expect: Not authorized)"; as_user $S "select public.gss_request_guardian_link('$GID','parent');"
t "B guardian enters an unknown ID (expect: empty result, no error)"; as_user $G "select public.gss_request_guardian_link('GSS-9999999999','parent');"
t "C guardian enters the real ID (expect: a uuid)"; as_user $G "select public.gss_request_guardian_link('$GID','parent');"
t "D duplicate request (expect: empty result)"; as_user $G "select public.gss_request_guardian_link('$GID','parent');"
LID=$($P -tAc "select id from public.guardian_links where guardian_id='$G'")
t "E pending: guardian sees no children (expect: 0 rows)"; as_user $G "select count(*) from public.gss_guardian_children();"
t "F pending: guardian reads payments (expect: 0 rows)"; as_user $G "select count(*) from public.gss_guardian_child_payments('$S');"
t "G stranger tries to accept the request (expect: Request not found)"; as_user $X "select public.gss_student_decide_guardian_link('$LID',true);"
t "H student accepts (expect: success)"; as_user $S "select public.gss_student_decide_guardian_link('$LID',true);"
t "I guardian sees child with enrollments (expect: 1 row)"; as_user $G "select student_name, global_student_id, relationship, enrollments from public.gss_guardian_children();"
t "J guardian reads child payments (expect: 2 rows)"; as_user $G "select reference, amount_minor, status from public.gss_guardian_child_payments('$S');"
t "K unlinked guardian reads same payments (expect: 0 rows)"; as_user $X "select count(*) from public.gss_guardian_child_payments('$S');"
t "L student revokes (expect: success)"; as_user $S "select public.gss_student_revoke_guardian_link('$LID');"
t "M guardian after revoke (expect: 0 children, 0 payments)"; as_user $G "select (select count(*) from public.gss_guardian_children()) as children, (select count(*) from public.gss_guardian_child_payments('$S')) as payments;"
t "N institution finance summary (expect: tuition and fees rows)"; as_user $I "select * from public.gss_institution_finance_summary();"
t "O student reads finance summary (expect: 0 rows)"; as_user $S "select count(*) from public.gss_institution_finance_summary();"
t "P platform admin stats (expect: json)"; as_user $A "select public.gss_admin_dashboard_stats();"
t "Q guardian reads admin stats (expect: null)"; as_user $G "select public.gss_admin_dashboard_stats() is null as denied;"
t "Q2 platform admin grants guardian role by email (expect: uuid)"; as_user $A "select public.gss_admin_grant_guardian_role('stranger@test');"
t "R platform admin lists roles (expect: 5 rows with emails)"; as_user $A "select count(*) as roles, count(email) as with_email from public.gss_admin_list_role_assignments();"
t "Q3 guardian tries to grant a role (expect: Not authorized)"; as_user $G "select public.gss_admin_grant_guardian_role('admin@test');"
t "S guardian inserts a link directly (expect: permission denied)"; as_user $G "insert into public.guardian_links(guardian_id,student_id,relationship,status) values ('$G','$S','parent','active');"
t "T guardian reads gss_transactions directly (expect: 0 rows, no policy)"; as_user $G "select count(*) from public.gss_transactions;"
t "U student tries to read another student's payments (expect: 0 rows)"; as_user $X "select count(*) from public.gss_guardian_child_payments('$S');"
