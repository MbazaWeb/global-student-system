# Student wallet and mobile money (sandbox)

The student wallet at `/student/wallet` offers top-ups and tuition or fee payments through M-Pesa (Vodacom), Airtel Money and Mixx by Yas (Yas/Tigo).

## Current state
- UI: balance card, provider detection from the phone number, amount quick-picks, review step, approval waiting state with status polling, and recent activity.
- Implementation: `src/integrations/mobile-money/MockMobileMoneyAdapter.ts`, an in-memory sandbox. It never writes to `gss_transactions` and moves no real money. Numbers ending in `0000` simulate a failed payment.
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
