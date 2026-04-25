// LiteAPI client — hotels supplier.
// Docs: https://docs.liteapi.travel/
import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";

const BASE = "https://api.liteapi.travel/v3.0";

function key(): string {
  const k = process.env.LITEAPI_API_KEY;
  if (!k) throw new Error("LITEAPI_API_KEY not configured");
  return k;
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUTS.search): Promise<T> {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key(),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  }, { providerName: "LiteAPI", timeoutMs });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const err = json as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message || `LiteAPI error ${res.status}`);
  }
  return json as T;
}

export type HotelSearchInput = {
  city_code?: string;     // legacy, ignored
  city_name?: string;     // e.g. "Dubai"
  country_code?: string;  // ISO-2, e.g. "AE" — required by LiteAPI
  checkin: string;        // YYYY-MM-DD
  checkout: string;
  adults: number;
  children?: number;
  currency?: string;
};

export async function searchHotelRates(input: HotelSearchInput) {
  // LiteAPI /data/hotels requires countryCode (mandatory). cityName is optional but recommended.
  const country = input.country_code;
  if (!country) throw new Error("country_code is required for hotel search");
  const params = new URLSearchParams({ countryCode: country, limit: "20" });
  if (input.city_name) params.set("cityName", input.city_name);
  const hotelsListPath = `/data/hotels?${params.toString()}`;
  const hotelsRes = await call<{ data: Array<{ id: string; name: string; address?: string; stars?: number; main_photo?: string }> }>(hotelsListPath);
  const hotelIds = hotelsRes.data.slice(0, 20).map((h) => h.id);
  if (hotelIds.length === 0) return { hotels: [] };

  // Step 2: get rates for those hotels
  const ratesBody = {
    hotelIds,
    occupancies: [{ adults: input.adults, children: input.children ? Array.from({ length: input.children }).map(() => 8) : [] }],
    checkin: input.checkin,
    checkout: input.checkout,
    currency: input.currency || "USD",
    guestNationality: "US",
  };
  const ratesRes = await call<{ data: Array<{ hotelId: string; roomTypes?: Array<{ rates?: Array<{ retailRate?: { total?: Array<{ amount?: number; currency?: string }> }; offerId?: string }> }> }> }>(
    "/hotels/rates",
    { method: "POST", body: JSON.stringify(ratesBody) },
  );

  const byId = new Map(hotelsRes.data.map((h) => [h.id, h]));
  return {
    hotels: ratesRes.data.map((r) => {
      const meta = byId.get(r.hotelId);
      const cheapest = r.roomTypes?.[0]?.rates?.[0];
      return {
        id: r.hotelId,
        name: meta?.name,
        address: meta?.address,
        stars: meta?.stars,
        photo: meta?.main_photo,
        offer_id: cheapest?.offerId,
        price: cheapest?.retailRate?.total?.[0]?.amount,
        currency: cheapest?.retailRate?.total?.[0]?.currency || input.currency || "USD",
      };
    }),
  };
}

export async function prebookHotel(offerId: string) {
  return call("/rates/prebook", {
    method: "POST",
    body: JSON.stringify({ offerId, usePaymentSdk: false }),
  });
}

export async function bookHotel(input: {
  prebookId: string;
  guests: Array<{ firstName: string; lastName: string; email: string }>;
  holder: { firstName: string; lastName: string; email: string };
  payment: { method: "ACC_CREDIT_CARD" | "WALLET"; };
}) {
  return call("/rates/book", {
    method: "POST",
    body: JSON.stringify({
      prebookId: input.prebookId,
      guestFirstName: input.holder.firstName,
      guestLastName: input.holder.lastName,
      guestEmail: input.holder.email,
      holder: input.holder,
      rooms: input.guests.map((g) => ({ firstName: g.firstName, lastName: g.lastName })),
      payment: input.payment,
    }),
  });
}
