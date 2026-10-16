/** accountService — MOCK. No real bank account data. */
export const accountService = {
  async listApplications() {
    return [
      { id: "mock-app-1", applicant: "Demo Student A", status: "Pending review", submittedAt: "2026-10-01" },
      { id: "mock-app-2", applicant: "Demo Student B", status: "Pending review", submittedAt: "2026-10-02" },
    ];
  },
  async listLinkedAccounts() {
    return [
      { id: "mock-acc-1", holder: "Demo Student A", masked: "•••• 1111", currency: "TZS", status: "Active" },
      { id: "mock-acc-2", holder: "Demo Student B", masked: "•••• 2222", currency: "TZS", status: "Active" },
    ];
  },
};
export {};
