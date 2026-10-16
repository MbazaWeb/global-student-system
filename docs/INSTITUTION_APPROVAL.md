# Institution approval workflow

1. Institutions submit an application at /institution/apply.
2. An authenticated platform_admin opens /admin/institutions/approvals.
3. Reviewer verifies institutional authority externally, adds a substantive review note, and moves status to reviewing.
4. After verification, reviewer approves or rejects; the database function enforces status transitions and records an audit entry.
5. Approval creates a verified institution record but **does not** automatically invite staff or verify students.

## Security
- Database RPC rechecks platform_admin; hiding UI controls is not sufficient.
- RLS allows platform admins to read applications and review audit only.
- Application submissions remain public and need CAPTCHA, throttling, email ownership checks and duplicate prevention before production.
- Admin provisioning requires a trusted backend and MFA.
- Review notes should avoid sensitive personal information.
