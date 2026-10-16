import type { BankAdapter } from "./BankAdapter";
export const mockBankAdapter: BankAdapter = { async verifyAccount() { return { verified: false }; } };
