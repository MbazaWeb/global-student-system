// SANDBOX ONLY. Holds test state in memory. Never writes to gss_transactions and moves no real money.
import { PaymentError, type MobileMoneyAdapter, type PaymentRequest, type PaymentResult } from "./MobileMoneyAdapter";
import { detectProvider, maskMsisdn } from "./phone";

const MIN_TZS = 1_000;
const MAX_TZS = 3_000_000;
const SETTLE_AFTER_MS = 4_000;

interface Stored {
  result: PaymentResult;
  msisdn: string;
  createdAt: number;
}

const store = new Map<string, Stored>();
let sandboxBalanceTzs = 0;

function makeReference(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SBX-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

function settle(entry: Stored): void {
  if (entry.result.status !== "pending") return;
  if (Date.now() - entry.createdAt < SETTLE_AFTER_MS) return;
  // Sandbox rule: numbers ending in 0000 simulate a declined payment.
  if (entry.msisdn.endsWith("0000")) {
    entry.result = { ...entry.result, status: "failed", failureReason: "Sandbox: simulated insufficient balance." };
    return;
  }
  entry.result = { ...entry.result, status: "completed" };
  if (entry.result.purpose === "wallet_topup") sandboxBalanceTzs += entry.result.amountTzs;
}

export const mockMobileMoneyAdapter: MobileMoneyAdapter = {
  async requestPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!Number.isInteger(request.amountTzs) || request.amountTzs < MIN_TZS || request.amountTzs > MAX_TZS) {
      throw new PaymentError(`Amount must be between TZS ${MIN_TZS.toLocaleString("en-US")} and TZS ${MAX_TZS.toLocaleString("en-US")}.`);
    }
    const detected = detectProvider(request.msisdn);
    if (!detected || detected.id !== request.provider) {
      throw new PaymentError("This number does not belong to the selected provider.");
    }
    const reference = makeReference();
    const result: PaymentResult = {
      reference,
      status: "pending",
      provider: request.provider,
      amountTzs: request.amountTzs,
      purpose: request.purpose,
      maskedMsisdn: maskMsisdn(request.msisdn),
      createdAt: new Date().toISOString(),
    };
    store.set(reference, { result, msisdn: request.msisdn, createdAt: Date.now() });
    return { ...result };
  },

  async getPaymentStatus(reference: string): Promise<PaymentResult> {
    const entry = store.get(reference);
    if (!entry) throw new PaymentError("Payment not found.");
    settle(entry);
    return { ...entry.result };
  },
};

export function getSandboxBalanceTzs(): number {
  return sandboxBalanceTzs;
}

export function listSandboxActivity(): PaymentResult[] {
  for (const entry of store.values()) settle(entry);
  return [...store.values()].map((e) => ({ ...e.result })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
