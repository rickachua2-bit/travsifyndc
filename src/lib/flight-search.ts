export type SupplierOffers = { offers: Array<Record<string, unknown>> };

type ItineraryOffer = {
  id?: unknown;
  source?: unknown;
  slices?: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

/** Never collapse incomplete itineraries merely because a field is missing. */
export function flightItineraryKey(offer: ItineraryOffer): string | null {
  if (!Array.isArray(offer.slices) || !offer.slices.length) return null;
  const parts: string[] = [];
  for (const rawSlice of offer.slices) {
    const slice = record(rawSlice);
    if (!Array.isArray(slice.segments) || !slice.segments.length) return null;
    const segments: unknown[] = [];
    for (const rawSegment of slice.segments) {
      const segment = record(rawSegment);
      if (!segment.marketing_carrier || !segment.flight_number || !segment.departing_at || !segment.arriving_at) return null;
      segments.push([
        String(segment.marketing_carrier).toUpperCase(),
        String(segment.flight_number).replace(/^0+(?=\d)/, "").toUpperCase(),
        String(segment.departing_at).slice(0, 19), String(segment.arriving_at).slice(0, 19),
        segment.origin || slice.origin, segment.destination || slice.destination,
      ]);
    }
    parts.push(JSON.stringify(segments));
  }
  return JSON.stringify(parts);
}

/** Called after final-price sorting, so each itinerary keeps its cheapest supplier offer. */
export function uniqueFlightItineraries<T extends ItineraryOffer>(offers: T[]): T[] {
  const seen = new Set<string>();
  return offers.filter(offer => {
    const itinerary = flightItineraryKey(offer);
    const key = itinerary || (offer.id ? `${offer.source || ""}:${String(offer.id)}` : null);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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