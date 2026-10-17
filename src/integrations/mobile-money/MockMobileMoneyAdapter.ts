// SANDBOX ONLY. Saves per-user test activity in this browser. Moves no real money.
import { PaymentError, type MobileMoneyAdapter, type PaymentRequest, type PaymentResult } from "./MobileMoneyAdapter";
import { detectProvider, maskMsisdn } from "./phone";

const MIN_TZS = 1_000;
const MAX_TZS = 3_000_000;
const SETTLE_AFTER_MS = 4_000;

/**
 * Per the project rule: the mock adapter may persist to localStorage only
 * when VITE_MOBILE_MONEY_MODE is unset or "sandbox".
 *
 * If VITE_MOBILE_MONEY_MODE is "live", this mock adapter throws at module
 * load time. The mock adapter is sandbox-only and cannot process live
 * payments. Using it in live mode would give users a false sense of real
 * payment processing. Production must swap walletService's adapter for
 * one that calls a JWT-verified Supabase Edge Function.
 *
 * Manual check: run `node scripts/test_mock_adapter_mode.mjs` to verify
 * the live-mode throw and the localStorage persistence guard.
 */
const MODE = import.meta.env.VITE_MOBILE_MONEY_MODE;
const LIVE_MODE = MODE === "live";

/** Fail closed in live mode: this adapter never processes real money. The app itself keeps loading. */
function assertNotLive(): void {
  if (LIVE_MODE) {
    throw new PaymentError("Live mobile-money payments are not enabled in this build.");
  }
}
const PERSIST_TO_LOCAL_STORAGE = (MODE === undefined || MODE === "" || MODE === "sandbox");

interface Stored {
  result: PaymentResult;
  msisdn: string;
  createdAt: number;
}

const store = new Map<string, Stored>();
let storageKey = "";
function persist(): void {
  if (!PERSIST_TO_LOCAL_STORAGE) return;
  if (!storageKey || typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify([...store.entries()]));
}
export function setSandboxUser(userId: string): void {
  if (!PERSIST_TO_LOCAL_STORAGE) {
    store.clear();
    storageKey = "";
    return;
  }
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
    assertNotLive();
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
    assertNotLive();
    const entry = store.get(reference);
    if (!entry) throw new PaymentError("Payment not found.");
    settle(entry);
    return { ...entry.result };
  },
};

export function sandboxWalletOutgoing(purpose: "transfer" | "withdraw", amountTzs: number, destination: string): PaymentResult {
  assertNotLive();
  if (!Number.isSafeInteger(amountTzs) || amountTzs < MIN_TZS || amountTzs > MAX_TZS) throw new PaymentError("Enter an amount between TZS 1,000 and TZS 3,000,000.");
  if (!/^255[0-9]{9}$/.test(destination)) throw new PaymentError("Enter a valid Tanzanian mobile number.");
  if (amountTzs > getSandboxBalanceTzs()) throw new PaymentError("Insufficient sandbox wallet balance.");
  const reference = makeReference();
  const result: PaymentResult = { reference, status:"completed", provider:"wallet", amountTzs, purpose, maskedMsisdn:maskMsisdn(destination), createdAt:new Date().toISOString() };
  store.set(reference,{result,msisdn:"",createdAt:Date.now()});
  persist();
  return result;
}
export function getSandboxBalanceTzs(): number {
  for (const entry of store.values()) settle(entry);
  return [...store.values()].reduce((balance,{result})=>result.status!=="completed"?balance:result.purpose==="wallet_topup"?balance+result.amountTzs:(result.provider==="wallet" || result.purpose==="transfer" || result.purpose==="withdraw")?balance-result.amountTzs:balance,0);
}

export function listSandboxActivity(): PaymentResult[] {
  for (const entry of store.values()) settle(entry);
  return [...store.values()].map((e) => ({ ...e.result })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
