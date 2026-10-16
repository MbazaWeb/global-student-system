/**
 * bankMockData — MOCK / PROPOSED data for the bank portal.
 *
 * No real bank endpoints, credentials or account numbers are present.
 * Every value here is fabricated for UI demonstration. Live bank
 * integration requires a licensed partner and a server-side flow.
 */

export const MOCK_BANK_PROFILE = {
  name: "Proposed CRDB Partner",
  code: "CRDB-MOCK",
  country: "TZ",
  status: "Proposed" as const,
  contactEmail: "partner-mock@crdb.example",
  established: "2026-01-01",
};

export const MOCK_API_CONNECTIONS = [
  { id: "mock-api-1", name: "Sandbox payments API", status: "Sandbox", baseUrl: "(mock — no real endpoint)" },
  { id: "mock-api-2", name: "Sandbox KYC API", status: "Sandbox", baseUrl: "(mock — no real endpoint)" },
  { id: "mock-api-3", name: "Webhook receiver", status: "Proposed", baseUrl: "(mock — no real endpoint)" },
];

export const MOCK_ACCOUNT_APPLICATIONS = [
  { id: "mock-app-1", applicant: "Demo Student A", status: "Pending review", submittedAt: "2026-10-01" },
  { id: "mock-app-2", applicant: "Demo Student B", status: "Pending review", submittedAt: "2026-10-02" },
];

export const MOCK_ACCOUNT_VERIFICATIONS = [
  { id: "mock-ver-1", account: "Demo •••• 1111", status: "Verified", verifiedAt: "2026-10-03" },
  { id: "mock-ver-2", account: "Demo •••• 2222", status: "Pending", verifiedAt: "—" },
];

export const MOCK_LINKED_ACCOUNTS = [
  { id: "mock-acc-1", holder: "Demo Student A", masked: "•••• 1111", currency: "TZS", status: "Active" },
  { id: "mock-acc-2", holder: "Demo Student B", masked: "•••• 2222", currency: "TZS", status: "Active" },
];

export const MOCK_BANK_TRANSACTIONS = [
  { id: "mock-tx-1", reference: "DEMO-TX-001", amount: "TZS 50,000.00", status: "Settled", occurredAt: "2026-10-04" },
  { id: "mock-tx-2", reference: "DEMO-TX-002", amount: "TZS 10,000.00", status: "Pending", occurredAt: "2026-10-05" },
];

export const MOCK_SETTLEMENTS = [
  { id: "mock-set-1", reference: "DEMO-SET-001", total: "TZS 60,000.00", status: "Settled", settledAt: "2026-10-05" },
];

export const MOCK_RECONCILIATION = [
  { id: "mock-rec-1", reference: "DEMO-TX-001", bankStatus: "Settled", ledgerStatus: "Completed", match: "Match" },
  { id: "mock-rec-2", reference: "DEMO-TX-002", bankStatus: "Pending", ledgerStatus: "Pending", match: "Match" },
];

export const MOCK_KYC_REVIEWS = [
  { id: "mock-kyc-1", applicant: "Demo Student A", status: "Pending review", submittedAt: "2026-10-01" },
  { id: "mock-kyc-2", applicant: "Demo Student B", status: "Pending review", submittedAt: "2026-10-02" },
];

export const MOCK_WEBHOOK_LOGS = [
  { id: "mock-wh-1", event: "payment.completed", status: "Received", receivedAt: "2026-10-04" },
  { id: "mock-wh-2", event: "payment.pending", status: "Received", receivedAt: "2026-10-05" },
];

export const MOCK_BANK_AUDIT = [
  { id: "mock-aud-1", action: "API key rotated (mock)", actor: "system", at: "2026-10-01" },
  { id: "mock-aud-2", action: "Webhook received (mock)", actor: "system", at: "2026-10-04" },
];
