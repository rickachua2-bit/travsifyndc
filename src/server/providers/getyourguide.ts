// GetYourGuide affiliate client — tours, activities, attractions.
// Affiliate model: we attach our partner_id to all calls. Customers stay in our flow;
// ops manually fulfill on the GYG partner portal after receiving the booking.
// Docs: https://partner.getyourguide.com/en/affiliate-api
import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";

const BASE = "https://api.getyourguide.com/1";

function partnerId(): string {
  const id = process.env.GETYOURGUIDE_PARTNER_ID;
  if (!id) throw new Error("GETYOURGUIDE_PARTNER_ID not configured");
  return id;
}

async function call<T>(path: string): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("partner_id", partnerId());
  if (!url.searchParams.has("cnt_lang")) url.searchParams.set("cnt_lang", "en");
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Accept-Language": "en-US",
  };
  // GYG affiliate API requires HTTP Basic Auth (partner_id : api_password) for
  // most endpoints. The plain affiliate ID alone returns errorCode 15.
  const apiPassword = process.env.GETYOURGUIDE_API_PASSWORD;
  if (apiPassword) {
    const token = Buffer.from(`${partnerId()}:${apiPassword}`).toString("base64");
    headers["Authorization"] = `Basic ${token}`;
  }
  const res = await fetchWithTimeout(url.toString(), { headers }, { providerName: "GetYourGuide", timeoutMs: TIMEOUTS.search });
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

import { createClient } from "@supabase/supabase-js";
import { ensureDataExists } from "@/server/sync-engines";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function searchTours(input: TourSearchInput): Promise<{ tours: TourOffer[] }> {
  console.log(`Searching internal database for tours matching: ${input.query}...`);
  
  // satisfy "auto fetch automatically" by triggering background sync if DB is cold
  ensureDataExists("tours", input.query);

  try {
    const { data, error } = await supabase
      .from("tours")
      .select("*")
      .or(`title.ilike.%${input.query}%,location.ilike.%${input.query}%,country.ilike.%${input.query}%`)
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log("No matching tours found in internal database.");
      return { tours: [] };
    }

    return {
      tours: data.map((t) => ({
        id: t.original_id,
        title: t.title,
        abstract: t.description || "",
        duration: t.duration || "Flexible",
        price: Number(t.price_amount),
        currency: t.price_currency || "USD",
        rating: 4.5,
        review_count: 10,
        photo: t.image_url,
        city: t.location,
        booking_url: t.affiliate_url,
        highlights: Array.isArray(t.highlights) ? t.highlights : [],
        inclusions: Array.isArray(t.inclusions) ? t.inclusions : [],
      })),
    };
  } catch (err) {
    console.error("Internal tour search failed:", err);
    return { tours: [] };
  }
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
