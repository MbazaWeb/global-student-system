# Transaction history and statements (Phase 13)
Read-only GSS transaction ledger and two role-scoped screens:
- Student: /student/transactions — own transactions and downloadable/shareable CSV statement.
- Institution Admin: /institution/transactions — institution transactions and CSV export.
RLS restricts SELECT to transaction owner or the assigned institution admin. There are no client INSERT/UPDATE/DELETE grants. No transactions are fabricated, and no real payment processing is implemented.
Amount is stored in minor units (amount_minor / 100 shown). Before supporting currencies with non-two-decimal exponents, add ISO-4217 exponent handling. CSV includes identifiers and financial data: users must share it only with trusted recipients. Export covers only the most recent 1000 loaded transactions, filtered client-side; it is not a complete official statement for large accounts. Production requires server-side pagination, signed payment webhooks, immutable financial audit trails, reconciliation, dispute workflows and server-generated statements.
