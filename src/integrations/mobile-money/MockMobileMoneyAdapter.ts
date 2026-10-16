// SANDBOX ONLY. Saves per-user test activity in this browser. Moves no real money.
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
let storageKey = "";
function persist(): void {
  if (!storageKey || typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify([...store.entries()]));
}
export function setSandboxUser(userId: string): void {
  const key = `gss-sandbox-wallet-v1:${userId}`;
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(key);
  store.clear();
  storageKey = key;
  if (!raw) return;
  try {
    const entries = JSON.parse(raw) as [string, Stored][];
    if (!Array.isArray(entries)) return;
    for (const [reference, entry] of entries) {
      if (entry?.result?.reference === reference && Number.isInteger(entry.result.amountTzs) && entry.result.amountTzs > 0 && Number.isFinite(entry.createdAt)) store.set(reference, entry);
    }
  } catch { localStorage.removeItem(key); }
}

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
    persist();
    return;
  }
  entry.result = { ...entry.result, status: "completed" };
  persist();
}

export const mockMobileMoneyAdapter: MobileMoneyAdapter = {
  async requestPayment(request: PaymentRequest): Promise<PaymentResult> {
    const minimum = request.purpose === "merchant" ? 100 : MIN_TZS;
    if (request.purpose === "merchant" && (!request.merchantName?.trim() || !request.merchantCode?.trim())) throw new PaymentError("Select a merchant before paying.");
    if (!Number.isInteger(request.amountTzs) || request.amountTzs < minimum || request.amountTzs > MAX_TZS) {
      throw new PaymentError(`Amount must be between TZS ${minimum.toLocaleString("en-US")} and TZS ${MAX_TZS.toLocaleString("en-US")}.`);
    }
    const isBank = request.provider === "bank";
    const isWallet = request.provider === "wallet";
    if (isWallet && request.purpose === "wallet_topup") throw new PaymentError("Choose mobile money or bank to top up your wallet.");
    if (isWallet && request.amountTzs > getSandboxBalanceTzs()) throw new PaymentError("Insufficient Main Wallet balance. Top up or choose another source.");
    if (isBank && (!request.bankName?.trim() || !/^\d{6,24}$/.test(request.accountNumber ?? ""))) {
      throw new PaymentError("Enter a bank name and a valid account number (6–24 digits).");
    }
    const detected = detectProvider(request.msisdn);
    if (!isBank && !isWallet && (!detected || detected.id !== request.provider)) {
      throw new PaymentError("This number does not belong to the selected provider.");
    }
    const reference = makeReference();
    const result: PaymentResult = {
      reference,
      status: isWallet ? "completed" : "pending",
      provider: request.provider,
      amountTzs: request.amountTzs,
      purpose: request.purpose,
      merchantName: request.merchantName,
      merchantCode: request.merchantCode,
      bankName: isBank ? request.bankName?.trim() : undefined,
      maskedMsisdn: isWallet ? "Main Wallet" : isBank ? `•••• ${request.accountNumber?.slice(-4)}` : maskMsisdn(request.msisdn),
      createdAt: new Date().toISOString(),
    };
    store.set(reference, { result, msisdn: request.msisdn.endsWith("0000") ? "0000" : "", createdAt: Date.now() });
    persist();
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
  for (const entry of store.values()) settle(entry);
  return [...store.values()].reduce((balance,{result})=>result.status!=="completed"?balance:result.purpose==="wallet_topup"?balance+result.amountTzs:result.provider==="wallet"?balance-result.amountTzs:balance,0);
}

export function listSandboxActivity(): PaymentResult[] {
  for (const entry of store.values()) settle(entry);
  return [...store.values()].map((e) => ({ ...e.result })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
