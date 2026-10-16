/** reconciliationService — MOCK. No real bank reconciliation data. */
export const reconciliationService = {
  async listReconciliation() {
    return [
      { id: "mock-rec-1", reference: "DEMO-TX-001", bankStatus: "Settled", ledgerStatus: "Completed", match: "Match" },
      { id: "mock-rec-2", reference: "DEMO-TX-002", bankStatus: "Pending", ledgerStatus: "Pending", match: "Match" },
    ];
  },
};
export {};
