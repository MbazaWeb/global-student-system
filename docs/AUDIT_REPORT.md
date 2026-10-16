# GSS Audit Report

Branch: `main`
Audit date: 2026-10-17
Auditor: automated pass

## Environment

- `rm -rf node_modules && npm ci && npm run build` — **PASS** (after lockfile repair; see finding E-1)
- `npx eslint src` — **PASS** (0 errors, 0 warnings)
- `npx tsc -b --noEmit` — **PASS** (0 errors)
- All 15 migrations apply with `ON_ERROR_STOP=1` to a local PostgreSQL 17 — **PASS**
- `supabase/tests/guardian_access_test.sh` (23 cases) — **PASS** (all cases match expected outcomes)
- Browser run: **not performed**. Findings below are from static source review + SQL harness. Layout claims (360px width, touch-target sizes) are inferred from the CSS classes used, not measured in a live viewport.

Findings are grouped by area, with severity (critical / high / medium / low) and status (fixed / deferred / needs decision).

---

## 1. Environment

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| E-1 | deps | `package-lock.json` | Lockfile was missing platform-specific binary packages for `@tailwindcss/oxide` and `@esbuild`, so `npm ci` failed on Linux. | high | fixed (commit `6f3a0ce`) |
| E-2 | tests | `supabase/tests/guardian_access_test.sh:35` | Line reads `echo "seed ok"echo "seed ok"` — a copy-paste typo. Cosmetic only; does not affect test correctness. | low | fixed |

---

## 2. Student portal (`src/portals/student/`)

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| S-1 | dead code | `pages/StudentRegistration.tsx`, `pages/StudentLogin.tsx` | Both are scaffolds and are not imported anywhere in `src/App.tsx` or any other module. The live auth routes use `src/pages/Register.tsx` and `src/pages/Login.tsx`. Confirmed via `rg "StudentRegistration\|StudentLogin"` — only self-references. | low | fixed (deleted) |
| S-2 | scaffolds | `pages/Notifications.tsx`, `pages/Payments.tsx`, `pages/Transactions.tsx`, `pages/TuitionFees.tsx`, `pages/Settings.tsx`, `pages/Support.tsx`, `pages/StudentDocuments.tsx`, `pages/BankAccountDetails.tsx` | All are 2-line scaffolds not wired to any route. Reported to feature-completion work; not rewritten here. | low | deferred (feature-completion) |
| S-3 | dead code | `pages/StudentDashboard.tsx`, `components/StudentHeader.tsx`, `components/StudentSidebar.tsx`, `components/VerificationBadge.tsx`, `components/StudentIDCard.tsx`, `StudentLayout.tsx` | `StudentDashboard.tsx` is not imported anywhere (the `/student/dashboard` route redirects to `/student/wallet`). The five components all `return null` and are not imported. `StudentLayout.tsx` is not imported. | low | deferred (refactor for taste is out of audit scope) |
| S-4 | wallet | `pages/StudentWallet.tsx` | Loads when Supabase is not configured? Yes — `walletService.getSummary()` throws, which propagates as `detailsError`/`error` and is rendered; no crash. Loading, empty and error states render for both the wallet summary and the student-details section. Amount validation uses whole TZS within MockMobileMoneyAdapter limits (1,000 – 3,000,000; 100 – 3,000,000 for merchant). Phone numbers normalise through `normalizeTzMsisdn` and accept 07XX / +255 7XX / 255 7XX / 7XX. Sign-out via `PortalNavigation` and via `StudentProfile` clears auth state and routes to `/login`. `/student/dashboard` redirects to `/student/wallet`. | — | no issue |
| S-5 | payment sheet | `components/wallet/PaymentSheet.tsx` | Polling stops on unmount (cleanup sets `active=false` and clears the latest `setTimeout`). Escape closes the sheet only when `step !== "processing"` (line 108). A failed payment shows a "Try again" button that returns to the review step (line 355). After `MAX_POLLS=60` polls (~90 s at 1.5 s), `timedOut` is set and the done step shows "Still processing — Check your activity in a few minutes." | — | no issue |
| S-6 | merchant QR | `components/wallet/MerchantQrScanner.tsx` | Camera permission denial shows "Camera permission was denied. Allow the camera or upload a QR image." (line 30). Scanner cleanup stops the stream tracks and cancels the animation frame on unmount (line 32). `onScan` is wrapped in `useCallback` with empty deps in `PayMerchant.tsx`, so the effect does not re-run on parent re-render. | — | no issue |
| S-7 | bank linking | `pages/BankAccountLinking.tsx`, `pages/BankAccountDetails.tsx` | `BankAccountLinking` is clearly labelled "Demo preview only" (line 44) and uses `DEMO_PIN="1234"` / `DEMO_OTP="123456"`. Bank state lives in an in-memory `Map` and clears on reload. No real bank credentials, endpoints or account numbers are present. `BankAccountDetails` is a 2-line scaffold. | — | no issue |
| S-8 | profile | `pages/StudentProfile.tsx` | Profile update performs a direct `UPDATE` on `student_profiles` (line 127-129) rather than going through a SECURITY DEFINER function. RLS policy "student updates own profile" (migration 20261016000900) and DB CHECK constraints enforce: own-row only, `display_name` length 2-100, `phone ~ '^[+]?[0-9]{7,15}$'`, `country_code ~ '^[A-Z]{2}$'`, `date_of_birth <= current_date`, `avatar_path` must be `<id>/...`. Avatar upload goes through the `student-avatars` storage bucket whose RLS requires the path's first segment to equal `auth.uid()`. | medium | needs decision (see §11-D1) |
| S-9 | identity | `pages/StudentIdentity.tsx` | Read-only. All queries match real column names. Loading, empty and error states render. | — | no issue |
| S-10 | admission | `pages/AdmissionVerification.tsx` | Status values `pending / verified / rejected / review_required` exactly match the DB check constraint on `student_enrollments.verification_status` (migration 20261016000100 line 20). RPC `gss_submit_enrollment_details` is called with the correct parameter names and matches migration 20261016192014. Mock institutions are present only in `import.meta.env.DEV` and clear on reload. | — | no issue |
| S-11 | guardian requests | `pages/GuardianRequests.tsx` | Buttons use `px-3 py-2 text-sm` — ~36 px tall, below the 44 px touch target minimum. | medium | fixed |
| S-12 | verification history | `pages/VerificationHistory.tsx` | Status values `pending / verified / rejected` match the DB check on `enrollment_verification_requests.status` (migration 20261016000500 line 35). Read-only, all queries match real columns. | — | no issue |

---

## 3. Guardian portal (`src/portals/guardian/`)

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| G-1 | access | `services/guardianService.ts`, `pages/GuardianDashboard.tsx`, `pages/ChildPayments.tsx` | All reads/writes go through `gss_request_guardian_link`, `gss_guardian_children`, `gss_guardian_child_payments`, `gss_student_decide_guardian_link`, `gss_student_revoke_guardian_link`. Each function checks `gss_has_role('parent_guardian')` and the guardian-link existence. The SQL harness confirms a guardian cannot reach a student's data without an active link (cases K, M, U). | — | no issue |
| G-2 | touch targets | `pages/GuardianDashboard.tsx` | "Send request" button and "View payments" link use `px-4 py-2` / `px-3 py-2` — below 44 px. | medium | fixed |

---

## 4. Institution portal (`src/portals/institution/`)

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| I-1 | scope | `pages/StudentDirectory.tsx`, `pages/StudentVerification.tsx`, `pages/FinanceReports.tsx`, `pages/InstitutionDashboard.tsx` | All four routed pages call security-definer functions that derive the caller's `institution_id` from `user_role_assignments` (no client-provided institution selector). `gss_institution_student_directory`, `gss_institution_verification_queue`, `gss_institution_finance_summary`, `gss_decide_enrollment_verification` all check `gss_is_institution_admin(institution_id)`. | — | no issue |
| I-2 | permissions | `pages/StudentDirectory.tsx`, `pages/StudentVerification.tsx`, `pages/FinanceReports.tsx`, `pages/InstitutionDashboard.tsx` | None of the routed institution pages can create institutions, approve applications, or assign institution_admin. Those admin actions live only in the admin portal behind `platform_admin`-checked RPCs. | — | no issue |
| I-3 | column match | `pages/FinanceReports.tsx`, `pages/StudentDirectory.tsx` | `FinanceReports` consumes the `gss_institution_finance_summary()` row shape (transaction_type, status, currency_code, transaction_count, total_minor) — matches migration 20261016200000 line 157. `StudentDirectory` consumes `gss_institution_student_directory()` shape — matches migration 20261016001000 line 3. | — | no issue |
| I-4 | touch targets | `pages/StudentDirectory.tsx`, `pages/StudentVerification.tsx` | Refresh buttons and verify/reject buttons use small padding; below 44 px. | medium | fixed |
| I-5 | scaffolds | `pages/AcademicYears.tsx`, `pages/AuditLogs.tsx`, `pages/Departments.tsx`, `pages/InstitutionProfile.tsx`, `pages/InstitutionRegistration.tsx`, `pages/InstitutionVerification.tsx`, `pages/IntegrationSettings.tsx`, `pages/PaymentReconciliation.tsx`, `pages/PendingVerifications.tsx`, `pages/Programmes.tsx`, `pages/Settings.tsx`, `pages/StaffManagement.tsx`, `pages/StudentAdmissions.tsx`, `pages/StudentEnrollment.tsx`, `pages/StudentExport.tsx`, `pages/StudentImport.tsx`, `pages/StudentStatus.tsx`, `pages/TuitionManagement.tsx` | All are 2-line scaffolds not wired to any route. Reported to feature-completion work. | low | deferred (feature-completion) |
| I-6 | dead components | `components/AdmissionStatusBadge.tsx`, `components/InstitutionHeader.tsx`, `components/InstitutionSidebar.tsx`, `components/StudentTable.tsx`, `components/VerificationQueue.tsx`, `InstitutionLayout.tsx` | All `return null` or are passthrough wrappers; not imported anywhere. | low | deferred (refactor for taste) |

---

## 5. Admin portal (`src/portals/admin/`)

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| A-1 | auth | `pages/AdminDashboard.tsx`, `pages/InstitutionApprovals.tsx`, `pages/InstitutionAdminAssignments.tsx`, `pages/RolesPermissions.tsx` | All admin writes go through RPCs that check `gss_has_role('platform_admin')` (or the equivalent `exists(... role='platform_admin')` check in `gss_review_institution` and `gss_assign_institution_admin`). | — | no issue |
| A-2 | null handling | `pages/AdminDashboard.tsx` | `gss_admin_dashboard_stats()` returns null when the caller is not a platform admin. The page sets `error = "Not authorized."` and renders the error paragraph instead of the stats grid. | — | no issue |
| A-3 | function match | `pages/InstitutionApprovals.tsx`, `pages/InstitutionAdminAssignments.tsx`, `pages/RolesPermissions.tsx` | `gss_review_institution`, `gss_assign_institution_admin`, `gss_admin_list_role_assignments`, `gss_admin_grant_guardian_role` — all called with the correct parameter names and matched against migrations 20261016000400, 20261016000700, 20261016200000. | — | no issue |
| A-4 | touch targets | `pages/InstitutionApprovals.tsx`, `pages/InstitutionAdminAssignments.tsx`, `pages/RolesPermissions.tsx` | Decision buttons and the grant-guardian button use small padding; below 44 px. | medium | fixed |
| A-5 | scaffolds | `pages/AuditLogs.tsx`, `pages/BankVendorManagement.tsx`, `pages/CountryManagement.tsx`, `pages/IntegrationManagement.tsx`, `pages/PlatformAnalytics.tsx`, `pages/SecurityMonitoring.tsx`, `pages/StudentManagement.tsx`, `pages/SystemSettings.tsx`, `pages/UserManagement.tsx`, `pages/VerificationMonitoring.tsx` | All are 2-line scaffolds not wired to any route. PortalShell renders them as "Coming later — not operational". Reported to feature-completion work. | low | deferred (feature-completion) |
| A-6 | dead components | `components/AdminHeader.tsx`, `components/AdminSidebar.tsx`, `components/PlatformStats.tsx`, `AdminLayout.tsx` | All `return null` or are passthrough wrappers; not imported anywhere. | low | deferred (refactor for taste) |

---

## 6. Bank portal (`src/portals/bank/`)

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| B-1 | mock labelling | `src/App.tsx:37`, `src/components/shared/PortalShell.tsx`, `src/integrations/banking/CRDBAdapter.ts`, `src/integrations/banking/MockBankAdapter.ts`, `src/integrations/banking/demoBankSecurity.ts` | Bank portal is labelled "Proposed CRDB partner — mock only" in the portals config. PortalShell shows "No live banking connection or wallet balance is enabled." `CRDBAdapter.ts` is a placeholder with no API contract. `MockBankAdapter.verifyAccount()` returns `{verified:false}`. `demoBankSecurity.ts` hardcodes `DEMO_PIN="1234"` and `DEMO_OTP="123456"` and is commented "UI simulation only." No real bank credentials, endpoints or account numbers are present. | — | no issue |
| B-2 | scaffolds | every `pages/*.tsx`, every `services/*.ts`, every `components/*.tsx`, `BankLayout.tsx` | Every bank page is a 2-line scaffold. Every service file is `export {}`. Every component `return null`. Only `/bank/dashboard` is routed (via PortalShell). | low | deferred (feature-completion) |

---

## 7. Shared code and routing

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| R-1 | CSV export | `src/components/shared/TransactionHistory.tsx:14` | CSV cell quoting protects against formula injection: `/^[ \t]*[=+@-]/.test(v)` triggers a leading single-quote. The 1000-row limit is enforced (`.limit(1000)` on line 10) and shown to the user on line 57 ("Latest 1,000 ledger records."). | — | no issue |
| R-2 | routing | `src/auth/ProtectedRoute.tsx` | Unauthenticated user is redirected to `/login` with `state.from` preserving the attempted path. | — | no issue |
| R-3 | routing | `src/auth/RoleGuard.tsx` | User with no matching role is redirected to `/unauthorized`. | — | no issue |
| R-4 | routing | `src/auth/AuthProvider.tsx` | Role changes by an admin are not pushed to the client. The `roles` state is refreshed only on auth state change (sign-in / sign-out). A user who is granted a new role must sign out and sign back in, or refresh the page. | medium | needs decision (see §11-D2) |
| R-5 | routing | `src/pages/DashboardRouter.tsx` | Role priority is `platform_admin → institution_admin → bank_admin/bank_officer → parent_guardian → student → unauthorized`. Guardian is checked before student, so a user with both roles lands in the guardian portal. | — | no issue |
| R-6 | routing | `src/App.tsx:72` | Duplicate route: `/admin/dashboard` is defined twice. First as `<Route path="/admin/dashboard" element={<AdminDashboard/>}/>` inside the platform_admin RoleGuard. Then again (via the `portals.filter(p=>p.key!=="institution"&&p.key!=="student")` map) as `<Route path="/admin/dashboard" element={<PortalShell .../>}/>` inside another platform_admin RoleGuard. React Router resolves the first match, so `AdminDashboard` wins — but the duplicate is dead config and should be removed. | medium | fixed |
| R-7 | navigation | `src/components/shared/PortalNavigation.tsx` | All navigation `to` values resolve to real routes: `/student/wallet`, `/student/merchant`, `/student/wallet?pay=tuition`, `/student/profile`, `/student/guardians`, `/institution/dashboard`, `/institution/students`, `/institution/verification`, `/institution/transactions`, `/institution/finance`, `/admin/dashboard`, `/admin/institutions/approvals`, `/admin/institutions/admins`, `/admin/roles`, `/guardian/dashboard`, `/bank/dashboard`. | — | no issue |
| R-8 | console / any | `src/**` | `rg "console\.(log\|debug\|info\|warn\|error)"` returns no matches. `rg ":\s*any\b\|<any>\|as any"` returns no matches. | — | no issue |
| R-9 | banking integrations | `src/integrations/banking/demoBankSecurity.ts`, `src/integrations/banking/merchantDirectory.ts` | No real identifiers or keys. Demo PIN/OTP are clearly fake (`1234`/`123456`). Merchant directory is explicitly "Demo" prefixed. | — | no issue |
| R-10 | secrets | `src/lib/supabase.ts:3-4` | Hardcoded fallback `url = "https://guqrahxasuebxpdvkslm.supabase.co"` and `key = "sb_publishable_3YQGHiKwDPDU50ODKml9Jw_qKcQmRgg"`. The anon/publishable key is designed to be public, but the user's rule is "no secrets in the repo or in browser code." The hardcoded values will also go stale when credentials are rotated. | medium | fixed |

---

## 8. Database

| ID | Area | File | What is wrong | Severity | Status |
|---|---|---|---|---|---|
| D-1 | signup trigger | `supabase/migrations/20261016000300_student_onboarding.sql:3-14` | `gss_create_student_on_signup` is `security definer set search_path = ''`, revoked from `public/anon/authenticated`, and inserts only the `student` role. Open decision: every new auth user (including future guardians/admins) gets a student profile and the student role. Recorded per audit instructions; not changed. | — | needs decision (see §11-D3) |
| D-2 | RLS | all migrations | Every base table has `enable row level security`: `institutions`, `student_profiles`, `student_enrollments`, `user_role_assignments`, `institution_applications`, `institution_review_audit`, `enrollment_verification_requests`, `institution_admin_audit`, `student_global_ids`, `gss_transactions`, `guardian_links`. | — | no issue |
| D-3 | client write grants | migrations | Direct client write grants exist on only two tables: `student_profiles` UPDATE (migration 20261016000900 + 20261016192541) and `institution_applications` INSERT (migration 20261016000300). Both have RLS policies and CHECK constraints. All other tables are select-only to clients. See S-8 for the `student_profiles` decision item. | medium | needs decision (see §11-D1) |
| D-4 | SECURITY DEFINER | all migrations | Every `security definer` function sets `search_path = ''` (or `search_path=''`). Verified by `rg "security definer"` across all 15 migration files — 20 functions, all compliant. | — | no issue |
| D-5 | anon access | all migrations | No `grant execute on function ... to anon` exists. The only anon grants are `select` on `institutions` (verified rows only, public columns) and `insert` on `institution_applications` (with `status='pending'` check). Both are intentional. | — | no issue |
| D-6 | role check regression | `supabase/migrations/20261016200000_guardian_finance_admin_portals.sql:22-23` | Migration 20261016000500 removed `institution_staff` from the `user_role_assignments_role_check` constraint and deleted existing `institution_staff` rows (documented policy: "No institution_staff role is permitted"). Migration 20261016200000 dropped and re-added the check constraint to add `parent_guardian`, but in doing so re-added `institution_staff`. Verified locally: `insert into user_role_assignments(user_id,role) values (...,'institution_staff')` now succeeds. | high | fixed (new migration `20261017000001_re_drop_institution_staff.sql`) |

---

## 9. Verifications performed but not browser-tested

The following claims are inferred from CSS classes and source structure, not measured in a live viewport:

- Mobile layout works at 360 px width: every student page uses `max-w-2xl` with `px-5` and the `AuthenticatedLayout` adds `pb-[calc(6rem+env(safe-area-inset-bottom))]` so the bottom nav does not cover content. The wallet payment sheet uses `w-full max-w-md` with `sm:items-center`, so on a 360 px screen it renders as a bottom sheet.
- Touch targets: most interactive elements use `min-h-11` (44 px) or `min-h-12` (48 px). The exceptions called out in S-11, G-2, I-4, A-4 are fixed in this audit.
- No hover-dependent behaviour: all interactions are click/tap. `hover:` classes are only used for non-essential visual feedback.

---

## 10. Summary counts

| Severity | Total | Fixed | Deferred | Needs decision |
|---|---|---|---|---|
| Critical | 0 | 0 | 0 | 0 |
| High | 2 (E-1, D-6) | 2 | 0 | 0 |
| Medium | 9 (S-8, S-11, G-2, I-4, A-4, R-4, R-6, R-10, D-3) | 6 | 0 | 3 |
| Low | 5 (E-2, S-1, S-2, S-3, I-5, I-6, A-5, A-6, B-2) | 2 | 7 | 0 |

The "Total" column for Low counts the grouped rows (S-2, S-3, I-5, I-6, A-5, A-6, B-2) as one finding each.

## 11. Deferred items and decisions needed

### D1 — `student_profiles` direct UPDATE (S-8, D-3)
**Reason for deferral:** The current design uses RLS + CHECK constraints to validate self-service profile updates. Converting to a SECURITY DEFINER function would require a new migration, a new function, revoking the direct UPDATE grant, and updating `StudentProfile.tsx` to call the RPC. This is a non-trivial change with no security gap (RLS and CHECK constraints already enforce all validation). Recommend a team decision on whether all writes must go through functions, or whether RLS-protected direct writes are acceptable for self-service data.
**Do not change without a decision.**

### D2 — Role change refresh (R-4)
**Reason for deferral:** When a platform_admin grants a new role via `gss_admin_grant_guardian_role` (or any future grant RPC), the affected user's `roles` state in `AuthProvider` is not refreshed until they sign out and sign back in, or reload the page. The backend still enforces the new role on the next RPC call, so this is a UX issue, not a security issue. Fix options: (a) expose a `refreshRoles()` from `AuthProvider` and call it on window focus, (b) periodically poll `user_role_assignments`, (c) use Supabase realtime to subscribe to changes. Each option has tradeoffs. Recommend a team decision before implementing.
**Do not change without a decision.**

### D3 — Auto-student on signup (D-1)
**Reason for deferral:** The `gss_create_student_on_signup` trigger creates a `student_profiles` row and a `student` role assignment for every new auth user, including accounts that will later be granted `parent_guardian`, `institution_admin`, or `platform_admin`. This is the existing documented decision (see `docs/GUARDIAN_PORTAL.md` §"Open decisions" #1). Per audit instructions, do not change without a decision.
**Do not change without a decision.**

## 12. What could not be verified

- **Browser behaviour.** No browser was launched. All layout, touch-target, and rendering claims are inferred from the source. Specifically unverified: actual 360 px rendering, camera permission flow on a real device, signed-URL fetch for avatars, Supabase Auth state transitions on a live project.
- **Production Supabase project state.** The audit used a local PostgreSQL 17 with the `local_auth_stub.sql` stub. The production project at `guqrahxasuebxpdvkslm.supabase.co` was not queried. Schema drift between local migrations and the remote project is therefore not checked.
- **Edge Function side.** `supabase/functions/.gitkeep` is the only file; no Edge Functions exist. The mobile-money and banking flows are entirely browser-sandbox today, as documented in `docs/MOBILE_MONEY.md`.
