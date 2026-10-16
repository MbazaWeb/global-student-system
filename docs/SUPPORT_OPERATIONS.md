# Support Operations

Status: implementation in progress. This document is the spec for the support console and student support features.

## Roles

- `support_agent` — first-line support. Can list cases, read case detail, add notes (internal or student-visible), change case status, search transactions, request refunds.
- `support_lead` — escalation. Same as `support_agent` plus the ability to create refund requests.
- `platform_admin` — decides refund requests (approves / rejects / marks processed). No other role can decide refunds.
- `student` — opens cases from a transaction (or standalone), adds notes, closes own cases, lists own cases and refund requests.

## Student side

Route: `/student/support` (inside the student RoleGuard).

Page: `src/portals/student/pages/Support.tsx`.

Behaviour:
- Lists the student's own support cases (most recent first), with status badges.
- "Open a case" form: subject (3–200 chars), description (10–4000 chars), optional transaction selector (from the student's own `gss_transactions`), priority (low/normal/high/urgent).
- Case detail view: shows the case, the originating transaction (if any), refund request status (if any), and a timeline of student-visible notes. The student can add a reply (1–4000 chars) and close the case.
- Loading, empty and error states render. Supabase-not-configured shows a clear message and does not crash.

## Internal console

Route: `/support` (inside a `support_agent` / `support_lead` / `platform_admin` RoleGuard).

Pages live under `src/portals/support/`.

### `/support/dashboard` — `SupportDashboard.tsx`
- Open / in-progress / awaiting-student counts.
- Recent cases list (50 most recent, with status and priority).
- Link to case detail.

### `/support/cases` — `SupportCaseList.tsx`
- Filters: status, search by case id, subject, or description.
- Table of cases with student Global Student ID, subject, status, priority, assigned, created.
- Click a row to open `/support/cases/:id`.

### `/support/cases/:id` — `SupportCaseDetail.tsx`
- Case header: subject, status, priority, student Global Student ID, originating transaction reference.
- Notes timeline (internal and student-visible). Support sees both; student sees only student-visible (on the student side).
- "Add note" form: body (1–4000 chars), visibility (internal / student).
- "Change status" control: open / in_progress / awaiting_student / resolved / closed. Refunded is set only by the refund decision flow.
- "Request refund" form (support_lead + platform_admin only): amount (in minor units, cannot exceed transaction amount), currency, reason (10–2000 chars). Creates a `support_refund_requests` row and links it to the case.
- Refund decision panel (platform_admin only): approve / reject / mark processed, with a mandatory 10–2000 char note. Each decision writes a `support_refund_audit` row in the same transaction.

### `/support/transactions` — `SupportTransactionSearch.tsx`
- Single search box: matches transaction reference, student UUID, Global Student ID, or description.
- Returns up to 50 results. Each result links to the case if one exists for that transaction.

## Refund flow

1. Support agent or support lead opens a case.
2. Support lead (or platform_admin) creates a refund request via `gss_support_request_refund(case_id, transaction_id, amount_minor, currency_code, reason)`. The function verifies the transaction belongs to the case's student, the amount is positive and does not exceed the transaction amount, and the caller is support_lead or platform_admin. The refund request is created with `status='pending'` and linked to the case.
3. Platform admin decides via `gss_admin_decide_refund(refund_id, decision, note)` where decision ∈ {approved, rejected, processed}. The function:
   - Verifies caller is platform_admin.
   - Locks the refund row.
   - Enforces: approved only from pending; rejected only from pending; processed only from approved.
   - Writes a `support_refund_audit` row with previous_status, new_status, decided_by, note.
   - Notifies the student (notifications row).
   - If decision=processed, sets the case status to 'refunded'.
4. The student sees the refund status on their case detail and in a "Refund requests" list.

## Database

New tables (in migration `20261017000002_support_catalogues_audit.sql`):
- `public.support_cases` — case header.
- `public.support_case_notes` — notes (internal + student-visible).
- `public.support_refund_requests` — refund request header.
- `public.support_refund_audit` — refund decision audit.
- `public.notifications` — user-scoped notifications.

All tables have RLS enabled. No client insert/update/delete grants. All writes go through SECURITY DEFINER functions with `search_path = ''`, revoked from public/anon, granted to authenticated.

## Audit

- Refund decisions: `support_refund_audit` (previous_status, new_status, decided_by, note, created_at). Read-only to platform_admin.
- Case status changes and note additions update `support_cases.updated_at`. No separate audit table for these (the notes themselves are the audit trail).
- The unified admin audit log (`gss_admin_audit_log`) includes refund decisions alongside institution review and admin-assignment audits.

## Out of scope

- Email / SMS delivery of notifications. Notifications are stored in-app only; delivery is a future integration.
- Real money movement for refunds. `processed` only means "the admin has actioned this outside GSS"; no bank API is called.
- SLA timers, automatic escalation, canned responses, knowledge base, chat. These are future work.
