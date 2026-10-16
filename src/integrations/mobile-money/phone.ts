import { PROVIDERS, type ProviderInfo } from "./MobileMoneyAdapter";

/** Accepts +255 7XX…, 255…, 07XX… or 7XX… and returns 255XXXXXXXXX, or null if invalid. */
export function normalizeTzMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national: string | null = null;
  if (digits.length === 12 && digits.startsWith("255")) national = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("0")) national = digits.slice(1);
  else if (digits.length === 9) national = digits;
  if (!national || !/^[67]\d{8}$/.test(national)) return null;
  return `255${national}`;
}

export function detectProvider(msisdn: string): ProviderInfo | null {
  const localPrefix = `0${msisdn.slice(3, 5)}`;
  return PROVIDERS.find((p) => p.prefixes.includes(localPrefix)) ?? null;
}

export function maskMsisdn(msisdn: string): string {
  return `+${msisdn.slice(0, 3)} ${msisdn.slice(3, 5)}X XXX ${msisdn.slice(-3)}`;
}
