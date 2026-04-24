// GetYourGuide affiliate client — tours, activities, attractions.
// Affiliate model: we attach our partner_id to all calls. Customers stay in our flow;
// ops manually fulfill on the GYG partner portal after receiving the booking.
// Docs: https://partner.getyourguide.com/en/affiliate-api
const BASE = "https://api.getyourguide.com/1";

function partnerId(): string {
  const id = process.env.GETYOURGUIDE_PARTNER_ID;
  if (!id) throw new Error("GETYOURGUIDE_PARTNER_ID not configured");
  return id;
}

async function call<T>(path: string): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("partner_id", partnerId());
  const res = await fetch(url.toString(), {
    headers: { "Accept": "application/json", "Accept-Language": "en-US" },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`GetYourGuide error ${res.status}: ${text.slice(0, 200)}`);
  }
  return json as T;
}

export type TourSearchInput = {
  query: string;        // city or activity, e.g. "Dubai desert safari"
  date_from?: string;   // YYYY-MM-DD
  date_to?: string;
  currency?: string;
};

export type TourOffer = {
  id: string;
  title: string;
  abstract: string;
  duration: string;
  price: number;
  currency: string;
  rating: number;
  review_count: number;
  photo: string | null;
  city: string;
  booking_url: string; // for ops fulfillment
};

export async function searchTours(input: TourSearchInput): Promise<{ tours: TourOffer[] }> {
  const currency = input.currency || "USD";
  // Step 1: resolve query string → numeric location_id (GYG requires this for /tours/)
  const locRes = await call<{ data?: { locations?: Array<{ location_id: number; name: string; country?: string }> } }>(
    `/locations/?q=${encodeURIComponent(input.query)}&currency=${currency}&limit=1`,
  );
  const location = locRes.data?.locations?.[0];
  if (!location) return { tours: [] };

  // Step 2: fetch tours for that location
  const path = `/tours/?location_ids=${location.location_id}` +
    (input.date_from ? `&date_from=${input.date_from}` : "") +
    (input.date_to ? `&date_to=${input.date_to}` : "") +
    `&currency=${input.currency || "USD"}&limit=20`;
  const res = await call<{ data?: { tours?: Array<Record<string, unknown>> } }>(path);
  const tours = res.data?.tours || [];
  return {
    tours: tours.map((t) => ({
      id: String(t.tour_id),
      title: String(t.title),
      abstract: String(t.abstract || ""),
      duration: String(t.duration || ""),
      price: Number((t.price as Record<string, unknown> | undefined)?.amount ?? 0),
      currency: String((t.price as Record<string, unknown> | undefined)?.currency ?? input.currency ?? "USD"),
      rating: Number(t.overall_rating || 0),
      review_count: Number(t.number_of_ratings || 0),
      photo: ((t.photos as Array<Record<string, unknown>> | undefined)?.[0]?.url as string) || null,
      city: String((t.location as Record<string, unknown> | undefined)?.city ?? location.name ?? ""),
      booking_url: `https://www.getyourguide.com/-t${t.tour_id}/?partner_id=${partnerId()}`,
    })),
  };
}

/** GYG affiliate doesn't support direct booking — we capture the request and ops fulfills via the booking_url. */
export async function captureTourBookingIntent(input: {
  tour_id: string;
  date: string;
  participants: Array<{ first_name: string; last_name: string; age?: number }>;
  contact: { email: string; phone: string };
}) {
  return {
    captured: true,
    tour_id: input.tour_id,
    date: input.date,
    participants_count: input.participants.length,
    affiliate_url: `https://www.getyourguide.com/-t${input.tour_id}/?partner_id=${partnerId()}&date=${input.date}`,
  };
}
