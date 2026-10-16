# GSS Authorization

Supabase Auth provides sessions. Role assignments are stored in public.user_role_assignments with read-own-only RLS. Users cannot grant themselves privileged roles. Dashboard route guards are UI controls, not substitutes for backend authorization.

Before production: institution-scoped RLS, trusted onboarding/invites, MFA for staff, audit logs, security tests and a verified bank integration are required. No live wallet or CRDB functionality is enabled.
