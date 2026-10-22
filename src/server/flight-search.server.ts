import { collectFlightOffers, rankFlightOffers, uniqueFlightItineraries } from "@/lib/flight-search";
import { searchFlights, type DuffelSearchInput } from "./providers/duffel";
import { ndcSearch } from "./providers/ndc";
import { convert } from "./fx";

export async function searchBothFlightSuppliers(environment: "sandbox" | "live", input: DuffelSearchInput) {
  return collectFlightOffers(() => ndcSearch({ ...input, adults: input.adults ?? 1 }), () => searchFlights(environment, input));
}

export async function cheapestFlightsFirst<T extends { total_amount?: unknown; total_currency?: unknown; id?: unknown; slices?: unknown; source?: unknown }>(offers: T[]) {
  return uniqueFlightItineraries(await rankFlightOffers(offers, convert));
}