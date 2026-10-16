import type { MobileMoneyAdapter, PaymentRequest, PaymentResult } from "../../../integrations/mobile-money/MobileMoneyAdapter";
import { getSandboxBalanceTzs, listSandboxActivity, mockMobileMoneyAdapter } from "../../../integrations/mobile-money/MockMobileMoneyAdapter";

// Browser code never holds operator credentials. Every call is served by the sandbox today.
// Going live means swapping this adapter for one that invokes a JWT-verified Supabase Edge Function,
// which calls the operator API server-side and posts only verified results to gss_transactions.
const adapter: MobileMoneyAdapter = mockMobileMoneyAdapter;

export interface WalletSummary {
  balanceTzs: number;
  activity: PaymentResult[];
  isSandbox: true;
}

export const walletService = {
  requestPayment: (request: PaymentRequest) => adapter.requestPayment(request),
  getPaymentStatus: (reference: string) => adapter.getPaymentStatus(reference),
  async getSummary(): Promise<WalletSummary> {
    return { balanceTzs: getSandboxBalanceTzs(), activity: listSandboxActivity(), isSandbox: true };
  },
};
