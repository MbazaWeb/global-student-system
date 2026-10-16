# GSS Onboarding

## Students
- /register creates a Supabase Auth user.
- A database trigger creates student_profiles and a student role (never a privileged role).
- Email confirmation should be enabled in Supabase Auth.
- Admission/enrollment verification is separate and must be confirmed by an authorized institution.

## Institutions
- /institution/apply accepts an application, NOT institution access.
- GSS administrators must verify institutional authority out-of-band before approving.
- Institution staff invitations and scoped memberships remain future work.

## Banking
- CRDB is proposed only; no direct integration or bank officer signup exists.

## Security backlog
- Add CAPTCHA/rate limits and verified contact ownership for public applications.
- Enforce institution-scoped RLS for all staff data access.
- Implement administrator review, invitations, audit logs and MFA.
- Never treat submitted admission numbers or bank references as verified.
