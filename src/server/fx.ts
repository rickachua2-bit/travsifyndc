/**
 * Server-only FX helper. Converts amounts between supported display currencies
 * (currently USD, NGN). Uses exchangerate.host (free, no key) and caches the
 * USD-base table in module memory for 1h to avoid hammering the API.
 *
 * Provider prices already include all taxes; we just translate display.
 * Stripe requires the PaymentIntent currency to match what the user sees,
 * so the same converted amount is used for charging.
 */

export type DisplayCurrency = "USD" | "NGN";
export const SUPPORTED_CURRENCIES: DisplayCurrency[] = ["USD", "NGN"];

type Rates = { base: "USD"; rates: Record<string, number>; fetched_at: number };

let cache: Rates | null = null;
const TTL_MS = 60 * 60 * 1000;

// Fallback rates used if the FX API is unreachable. Refreshed periodically.
const FALLBACK: Rates = {
  base: "USD",
  rates: { USD: 1, NGN: 1650 },
  fetched_at: 0,
};

async function getRates(): Promise<Rates> {
  if (cache && Date.now() - cache.fetched_at < TTL_MS) return cache;
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=NGN,USD", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const j = (await res.json()) as { rates?: Record<string, number> };
    if (!j.rates || typeof j.rates.NGN !== "number") throw new Error("FX shape");
    cache = { base: "USD", rates: { USD: 1, NGN: j.rates.NGN }, fetched_at: Date.now() };
    return cache;
  } catch (e) {
    console.warn("[fx] using fallback rates:", (e as Error).message);
    return FALLBACK;
  }
}

/** Convert an amount from one currency to another. */
export async function convert(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return amount;
  const rates = await getRates();
  const inUsd = f === "USD" ? amount : amount / (rates.rates[f] ?? 1);
  return t === "USD" ? inUsd : inUsd * (rates.rates[t] ?? 1);
}

export function isSupportedCurrency(c: string): c is DisplayCurrency {
  return (SUPPORTED_CURRENCIES as string[]).includes(c.toUpperCase());
}
