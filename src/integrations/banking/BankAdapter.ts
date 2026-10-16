export interface BankAdapter { verifyAccount(reference: string): Promise<{verified: boolean}>; }
