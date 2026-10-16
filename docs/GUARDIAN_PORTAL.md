# Guardian portal, finance reports and platform dashboard

Migration: `supabase/migrations/20261016200000_guardian_finance_admin_portals.sql`

## Access model
- `parent_guardian` is a new role with no institution scope. Only a platform admin can grant it (`gss_admin_grant_guardian_role`). Self-service signup never grants it.
- A guardian sees a student only through a `guardian_links` row that the student approved (`status = 'active'`). The student can revoke it at any time.
- Clients have no insert, update or delete on `guardian_links` or `gss_transactions`. All reads of payments and summaries go through security-definer functions that check the caller's role.
- `gss_request_guardian_link` returns the same empty result for unknown IDs, duplicates and valid requests, so it cannot be used to discover which Global Student IDs exist.

## Functions
| Function | Caller | Purpose |
|---|---|---|
| `gss_request_guardian_link(global_id, relationship)` | guardian | Create a pending request |
| `gss_student_decide_guardian_link(link_id, accept)` | student | Approve or decline |
| `gss_student_revoke_guardian_link(link_id)` | student | Revoke an active link |
| `gss_guardian_children()` | guardian | Active children with enrollment status |
| `gss_guardian_child_payments(student_id)` | guardian | Payments for an active child |
| `gss_institution_finance_summary()` | institution admin | Totals by type, status and currency for their institution |
| `gss_admin_dashboard_stats()` | platform admin | Platform counts; returns null for others |
| `gss_admin_list_role_assignments()` | platform admin | Role list with emails |
| `gss_admin_grant_guardian_role(email)` | platform admin | Provision guardian access |

## Tests
`supabase/tests/guardian_access_test.sh` applies every migration to a local PostgreSQL database with a minimal Supabase auth stub, then checks 23 positive and negative access cases. Run it with a local PostgreSQL that has a superuser `tester` (password `x`) and database `gss`.

## Open decisions
1. **Auto-student on signup.** The existing trigger `gss_create_student_on_signup` gives every new account a student profile and the `student` role, including accounts meant to be guardians or admins. Consider passing a signup flag so only student signups get the role.
2. **Guardian identity.** Students see the relationship and date but not the guardian's name, because there is no guardian profile table. Add one if students need names.
3. **Rate limiting.** Global ID lookups are not rate-limited. Add a limit at the Edge or API layer before launch.
4. **Audit trail.** Role grants have no audit table yet. Add one before relying on this for compliance.
5. **Deploy.** Apply with `supabase db push`. The migration is additive and idempotent where possible.
