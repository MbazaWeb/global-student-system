import type { MobileMoneyAdapter, PaymentRequest, PaymentResult } from "../../../integrations/mobile-money/MobileMoneyAdapter";
import { getSandboxBalanceTzs, listSandboxActivity, mockMobileMoneyAdapter, setSandboxUser, sandboxWalletOutgoing } from "../../../integrations/mobile-money/MockMobileMoneyAdapter";
import { supabase } from "../../../lib/supabase";
import { bankPayload, consumeBankOtp, getDemoBank } from "../../../integrations/banking/demoBankSecurity";

// Browser code never holds operator credentials. Every call is served by the sandbox today.
// Going live means swapping this adapter for one that invokes a JWT-verified Supabase Edge Function,
// which calls the operator API server-side and posts only verified results to gss_transactions.
const adapter: MobileMoneyAdapter = mockMobileMoneyAdapter;

export interface WalletSummary {
  balanceTzs: number;
  activity: PaymentResult[];
  isSandbox: true;
}
async function loadStudentWallet() {
  if(!supabase)throw new Error("Sign in to view your wallet.");
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  if(!data.session?.user)throw new Error("Sign in to view your wallet.");
  setSandboxUser(data.session.user.id);
  return data.session.user.id;
}

export const walletService = {
  async requestPayment(request: PaymentRequest) {
    const userId=await loadStudentWallet();
    if(request.provider==="bank"){
      const bank=getDemoBank(userId);
      if(!bank||bank.bank!==request.bankName?.trim()||bank.number!==request.accountNumber)throw new Error("Add and confirm this bank account in Profile first.");
      consumeBankOtp(request.bankOtpToken,userId,bankPayload(bank.bank,bank.number,request.amountTzs,request.purpose,request.merchantCode));
    }
    return adapter.requestPayment(request);
  },
  async sandboxOutgoing(purpose: "transfer" | "withdraw", amountTzs: number, destination: string) {
    await loadStudentWallet();
    return sandboxWalletOutgoing(purpose, amountTzs, destination);
  },
  async getPaymentStatus(reference: string) { await loadStudentWallet(); return adapter.getPaymentStatus(reference); },
  async getSummary(): Promise<WalletSummary> {
    await loadStudentWallet();
    const activity=listSandboxActivity();
    return { balanceTzs: getSandboxBalanceTzs(), activity, isSandbox: true };
  },
};
