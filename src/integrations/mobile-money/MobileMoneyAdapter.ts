// Provider-neutral contract for Tanzanian mobile-money payments.
// In production these calls go through a server boundary (a Supabase Edge Function).
// Operator API keys must never reach the browser.

export type MobileMoneyProvider = "mpesa" | "airtel" | "mixx";
export type PaymentPurpose = "wallet_topup" | "tuition" | "fees";
export type PaymentStatus = "pending" | "completed" | "failed";

export interface ProviderInfo {
  id: MobileMoneyProvider;
  name: string;
  operator: string;
  accent: string;
  /** Local prefixes including the leading 0. Verify against current operator allocations before go-live. */
  prefixes: readonly string[];
}

export const PROVIDERS: readonly ProviderInfo[] = [
  { id: "mpesa", name: "M-Pesa", operator: "Vodacom", accent: "#16a34a", prefixes: ["074", "075", "076"] },
  { id: "airtel", name: "Airtel Money", operator: "Airtel", accent: "#dc2626", prefixes: ["068", "069", "078"] },
  { id: "mixx", name: "Mixx by Yas", operator: "Yas (Tigo)", accent: "#7c3aed", prefixes: ["065", "067", "071"] },
];

export interface PaymentRequest {
  provider: MobileMoneyProvider;
  /** Normalised international format, 255XXXXXXXXX. */
  msisdn: string;
  /** Whole Tanzanian shillings. */
  amountTzs: number;
  purpose: PaymentPurpose;
  description: string;
}

export interface PaymentResult {
  reference: string;
  status: PaymentStatus;
  provider: MobileMoneyProvider;
  amountTzs: number;
  purpose: PaymentPurpose;
  maskedMsisdn: string;
  createdAt: string;
  failureReason?: string;
}

export interface MobileMoneyAdapter {
  requestPayment(request: PaymentRequest): Promise<PaymentResult>;
  getPaymentStatus(reference: string): Promise<PaymentResult>;
}

export class PaymentError extends Error {}
