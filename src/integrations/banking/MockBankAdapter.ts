import type { BankAdapter } from "./BankAdapter";
export const mockBankAdapter: BankAdapter = { async verifyAccount(_reference: string) { return { verified: false }; } };
