# Institution Admin Assignment and Transfer

Platform admin route: /admin/institutions/admins

- An institution must already be approved.
- The new admin must be an existing, email-confirmed Supabase Auth user. The platform administrator must verify their real-world authority separately.
- Assignment or transfer happens in a single PostgreSQL transaction.
- Row lock on the institution serializes concurrent transfers; unique indexes enforce at most one institution admin.
- Previous institution admin assignment is removed, new one inserted, and change recorded in institution_admin_audit.
- The new admin cannot already administer another institution or hold a bank/platform privileged role.
- Student self-registration role remains unchanged; the user may have both student and institution_admin until stricter separation is implemented.

Not yet implemented: email invitations, MFA, transfer approvals, session invalidation and production operations audit dashboards. Existing sessions still require database RLS on every protected query; never rely solely on cached UI roles.
