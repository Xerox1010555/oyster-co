/* Currency formatting + pricing — pure functions, shared client/server. */

export type Rates = Record<string, number>;

export const FALLBACK_RATES: Rates = { USD: 1, EGP: 48.5, AED: 3.67, SAR: 3.75 };

export const CURRENCIES = ['USD', 'EGP', 'AED', 'SAR'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const SYMBOLS: Record<string, string> = { USD: '$', EGP: 'E£ ', AED: 'AED ', SAR: 'SAR ' };

export function fmt(usd: number, code: string, rates: Rates): string {
  const rate = rates[code] && rates[code] > 0 ? rates[code] : FALLBACK_RATES[code] ?? 1;
  const symbol = SYMBOLS[code] ?? code + ' ';
  return symbol + Math.round(usd * rate).toLocaleString('en-US');
}

/* ── Server-authoritative pricing ───────────────────────────────── */
export type PremiumMap = {
  // kind -> key -> cents
  bracelet: Record<string, number>;
  bezel: Record<string, number>;
};

export const FALLBACK_PREMIUMS: PremiumMap = {
  bracelet: { steel: 0, two: 260000, gold: 690000 },
  bezel: { steel: 0, gold: 50000, fluted: 90000, ceramic: 35000, pepsi: 55000, tachymeter: 45000 },
};

export const DIAL_NON_STOCK_CENTS = 25000;

export function computeUnitPriceCents(opts: {
  basePriceCents: number;
  stockDialKey: string;
  dialKey: string;
  bezelKey: string;
  braceletKey: string;
  premiums: PremiumMap;
}): number {
  const { basePriceCents, stockDialKey, dialKey, bezelKey, braceletKey, premiums } = opts;
  const braceletPremium = premiums.bracelet[braceletKey] ?? FALLBACK_PREMIUMS.bracelet[braceletKey] ?? 0;
  const bezelPremium = premiums.bezel[bezelKey] ?? FALLBACK_PREMIUMS.bezel[bezelKey] ?? 0;
  const dialPremium = dialKey === stockDialKey ? 0 : DIAL_NON_STOCK_CENTS;
  return basePriceCents + braceletPremium + bezelPremium + dialPremium;
}

export function makeConfigHash(productId: string, dialKey: string, bezelKey: string, braceletKey: string): string {
  return `${productId}|${dialKey}|${bezelKey}|${braceletKey}`;
}
