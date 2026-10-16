/** Matches existing screens: amounts are stored in minor units and shown with two decimals. */
export function formatMinor(amountMinor: number, currencyCode: string): string {
  const major = amountMinor / 100;
  return `${currencyCode} ${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
