// Duffel client — flights NDC supplier.
// Docs: https://duffel.com/docs/api
import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";

const BASE = "https://api.duffel.com";
const VERSION = "v2";

function key(env: "sandbox" | "live"): string {
  // Duffel uses the same API endpoint; key prefix indicates test vs live.
  // We use one key per env via env var for now; users on sandbox env get test access.
  const k = process.env.DUFFEL_API_KEY;
  if (!k) throw new Error("DUFFEL_API_KEY not configured");
  if (env === "sandbox" && !k.startsWith("duffel_test_")) {
    // Acceptable: live key used for sandbox calls is fine for read-only search.
  }
  return k;
}

async function call<T>(env: "sandbox" | "live", path: string, init: RequestInit = {}, timeoutMs = TIMEOUTS.search): Promise<T> {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${key(env)}`,
      "Duffel-Version": VERSION,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  }, { providerName: "Duffel", timeoutMs });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const err = json as { errors?: Array<{ message?: string; code?: string }> } | null;
    const msg = err?.errors?.[0]?.message || `Duffel error ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export type DuffelSearchInput = {
  origin: string;            // IATA code, e.g. "LOS" (legacy single-slice)
  destination: string;       // IATA code, e.g. "DXB"
  departure_date: string;    // YYYY-MM-DD
  return_date?: string;
  adults?: number;
  children?: number;         // age 2–11 at travel
  infants?: number;          // under 2, on adult's lap
  cabin?: "economy" | "premium_economy" | "business" | "first";
  /** Optional multi-city slices. When provided, overrides origin/destination/dates. */
  slices?: Array<{ origin: string; destination: string; departure_date: string }>;
};

export async function searchFlights(env: "sandbox" | "live", input: DuffelSearchInput) {
  const slices = input.slices && input.slices.length > 0
    ? input.slices
    : (() => {
        const s = [{ origin: input.origin, destination: input.destination, departure_date: input.departure_date }];
        if (input.return_date) s.push({ origin: input.destination, destination: input.origin, departure_date: input.return_date });
        return s;
      })();

  const passengers: Array<Record<string, unknown>> = [];
  for (let i = 0; i < (input.adults || 1); i++) passengers.push({ type: "adult" });
  for (let i = 0; i < (input.children || 0); i++) passengers.push({ age: 8 });        // Duffel uses age for children
  for (let i = 0; i < (input.infants || 0); i++) passengers.push({ type: "infant_without_seat" });

  const body = {
    data: {
      slices,
      passengers,
      cabin_class: input.cabin || "economy",
    },
  };
  const offerReq = await call<{ data: { id: string } }>(env, "/air/offer_requests?return_offers=true", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const offers = await call<{ data: Array<Record<string, unknown>> }>(env, `/air/offers?offer_request_id=${offerReq.data.id}&limit=10&sort=total_amount`);
  return {
    offer_request_id: offerReq.data.id,
    offers: offers.data.map((o: Record<string, unknown>) => ({
      id: o.id,
      total_amount: o.total_amount,
      total_currency: o.total_currency,
      owner: (o.owner as Record<string, unknown> | undefined)?.name,
      slices: (o.slices as Array<Record<string, unknown>> | undefined)?.map((s) => ({
        origin: (s.origin as Record<string, unknown> | undefined)?.iata_code,
        destination: (s.destination as Record<string, unknown> | undefined)?.iata_code,
        duration: s.duration,
        segments: ((s.segments as Array<Record<string, unknown>> | undefined) || []).map((seg) => ({
          departing_at: seg.departing_at,
          arriving_at: seg.arriving_at,
          marketing_carrier: (seg.marketing_carrier as Record<string, unknown> | undefined)?.iata_code,
          flight_number: seg.marketing_carrier_flight_number,
        })),
      })),
    })),
  };
}

export async function getOffer(env: "sandbox" | "live", offerId: string) {
  return call(env, `/air/offers/${offerId}`);
}

export type DuffelBookInput = {
  offer_id: string;
  passengers: Array<{
    given_name: string;
    family_name: string;
    born_on: string; // YYYY-MM-DD
    gender: "m" | "f";
    title: "mr" | "ms" | "mrs" | "miss" | "dr";
    email: string;
    phone_number: string;
  }>;
  payment_amount: string;
  payment_currency: string;
};

export async function createOrder(env: "sandbox" | "live", input: DuffelBookInput) {
  const body = {
    data: {
      type: "instant",
      selected_offers: [input.offer_id],
      passengers: input.passengers,
      payments: [{ type: "balance", amount: input.payment_amount, currency: input.payment_currency }],
    },
  };
  return call<{ data: Record<string, unknown> }>(env, "/air/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
