export type SupplierOffers = { offers: Array<Record<string, unknown>> };

/** Start both requests before awaiting either; preserve the healthy supplier. */
export async function collectFlightOffers(
  xml: () => Promise<SupplierOffers>,
  duffel: () => Promise<SupplierOffers>,
) {
  const results = await Promise.allSettled([
    Promise.resolve().then(xml),
    Promise.resolve().then(duffel),
  ]);
  const suppliers = ["xmlagency", "duffel"];
  const offers: Array<Record<string, unknown>> = [];
  const errors: unknown[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      offers.push(...result.value.offers.map(offer => ({ ...offer, source: suppliers[index] })));
    } else errors.push(result.reason);
  });
  return { offers, suppliers_called: suppliers, errors };
}

/** Compare final customer totals, never supplier base prices. */
export async function rankFlightOffers<T extends { total_amount?: unknown; total_currency?: unknown }>(
  offers: T[],
  convert: (amount: number, from: string, to: string) => Promise<number>,
) {
  const ranked = await Promise.all(offers.map(async offer => {
    const total = Number(offer.total_amount);
    const amount = Number.isFinite(total) && total > 0
      ? await convert(total, String(offer.total_currency || "USD"), "USD")
      : Number.POSITIVE_INFINITY;
    return { ...offer, comparison_amount: amount, comparison_currency: "USD" };
  }));
  return ranked.sort((a, b) => a.comparison_amount - b.comparison_amount);
}