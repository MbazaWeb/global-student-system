# Student wallet and mobile money (sandbox)

The student wallet at `/student/wallet` offers top-ups and tuition or fee payments through M-Pesa (Vodacom), Airtel Money and Mixx by Yas (Yas/Tigo).

## Current state
- UI: balance card, provider detection from the phone number, amount quick-picks, review step, approval waiting state with status polling, and recent activity.
- Implementation: `src/integrations/mobile-money/MockMobileMoneyAdapter.ts`, a sandbox with per-user browser-local activity. Current balance is completed top-ups minus completed Main Wallet payments. This editable browser data is not an authoritative financial ledger. It never writes to `gss_transactions` and moves no real money. Mobile numbers ending in `0000` simulate a failed payment.
- Browser code holds no operator credentials.

## Going live (required before real money)
1. Build a Supabase Edge Function per action (initiate, status, callback). It verifies the student's JWT, validates the amount and ownership server-side, and calls the operator API with secrets stored as function secrets.
2. Verify operator webhook signatures and make every callback idempotent by reference.
3. Post only verified results to `gss_transactions` from the server, never from the browser. The existing RLS already denies client writes.
4. Add idempotency keys on initiation so retries never double-charge.
5. Confirm merchant and operator agreements for each provider, and verify the phone prefixes in `MobileMoneyAdapter.ts` against current allocations.
6. Handle amounts in whole TZS and document the currency exponent (see `TRANSACTION_HISTORY.md`).
7. Add reconciliation, dispute workflows and an audit trail before launch.

## Phone rules
Accepted forms: `+255 7XX…`, `255…`, `07XX…`, `7XX…`. Prefixes are listed in `PROVIDERS`.

## Bank and merchant preview
- `/student/bank` supports a demo bank connection with registered mobile, demo PIN `1234` and demo OTP `123456`. No real bank PIN is requested or validated, and no SMS is sent. Connections and OTP challenges clear on reload.
- Bank payments require a fresh one-use demo OTP grant bound to user, bank account, amount, purpose and merchant code. Codes expire after five minutes and permit five attempts. These browser checks simulate UX only; production verification must run on the bank/server.
- `/student/merchant` provides network and merchant-number lookup, camera/image QR scanning, favourites, and recent completed sandbox payments. Example: M-Pesa `100001`. The directory is fictional; operator merchant lookup is not connected.
- Supported demo QR payload: `{"network":"mpesa","merchantNumber":"100001"}` or `swallet://merchant?network=mpesa&number=100001`. External QR URLs are never opened automatically.
- Main Wallet payments debit available sandbox funds. External mobile/bank tuition or merchant payments do not debit the Main Wallet balance.

## Profile and admission storage
- Enrollment course and academic year use `gss_submit_enrollment_details`, which reuses existing student/institution authorization checks.
- Profile photos use the private `student-avatars` bucket, with owner-folder access policies, JPG/PNG/WebP types and a 2 MB limit. PINs and OTPs are never stored in profile data.
- Local mock institutions and their enrollment requests exist only in development and clear on reload. They are not institution-approved records.
- Course catalogs and university fee balances are not connected. The UI marks unavailable values and disables Pay full until a balance source exists.
