import { collectFlightOffers, rankFlightOffers } from "@/lib/flight-search";
import { searchFlights, type DuffelSearchInput } from "./providers/duffel";
import { ndcSearch } from "./providers/ndc";
import { convert } from "./fx";

export async function searchBothFlightSuppliers(environment: "sandbox" | "live", input: DuffelSearchInput) {
  return collectFlightOffers(() => ndcSearch({ ...input, adults: input.adults ?? 1 }), () => searchFlights(environment, input));
}

export function cheapestFlightsFirst<T extends { total_amount?: unknown; total_currency?: unknown }>(offers: T[]) {
  return rankFlightOffers(offers, convert);
}