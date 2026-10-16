# Institution: single administrator policy

Each institution has at most one active institution_admin role assignment.
No institution_staff role is permitted. The database enforces the limit through a unique partial index, not just the UI.

An approved institution initially has no admin until a trusted GSS platform administrator provisions an existing Auth user. Provisioning and transfers are intentionally not exposed to browser clients. A change of admin must revoke the old assignment and grant the new one in a controlled transaction with audit logging.

The sole Institution Admin reviews admission/enrollment requests, handles institution settings and support issues as additional modules are implemented. All access must be scoped to their own institution.

The verification workflow has an institution-scoped read policy and a server-side RPC which checks role and institution ownership. It does not automatically accept admission numbers as proof. Pending requests require review against authoritative institution records.

Important: existing installations with multiple institution admins or staff roles must be reconciled before applying the migration. Production-grade admin transfers, enrollment intake, MFA, audit retention and invitation flow remain outstanding.
