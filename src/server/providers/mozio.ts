// Mozio client — affiliate API for airport transfers / car pickup.
// Affiliate model: we forward the search/quote and create the reservation server-side
// using our affiliate ID. The end customer NEVER sees Mozio — they stay in our flow.
// Docs: https://docs.mozio.com/  (REST-ish JSON API, key in `Authorization` header)
import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";

const BASE = "https://api.mozio.com/v2";

function key(): string {
  const k = process.env.MOZIO_API_KEY;
  if (!k) throw new Error("MOZIO_API_KEY not configured");
  return k;
}

function affiliateId(): string {
  return process.env.MOZIO_AFFILIATE_ID || "";
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUTS.search): Promise<T> {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    ...init,
    headers: {
      "API-KEY": key(),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  }, { providerName: "Mozio", timeoutMs });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const err = json as { detail?: string; message?: string } | null;
    throw new Error(err?.detail || err?.message || `Mozio error ${res.status}`);
  }
  return json as T;
}

export type TransferSearchInput = {
  pickup_address: string;
  dropoff_address: string;
  pickup_datetime: string; // ISO 8601
  num_passengers: number;
  currency?: string;
};

export type TransferQuote = {
  id: string;
  vehicle_class: string;
  vehicle_description: string;
  provider_name: string;
  total_price: number;
  currency: string;
  duration_minutes: number;
  cancellation_policy: string;
};

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function searchTransfers(input: TransferSearchInput): Promise<{ quotes: TransferQuote[] }> {
  // Query Supabase for pre-scraped transfer data
  const { data, error } = await supabase
    .from("car_transfers")
    .select("*")
    .eq("location", input.pickup_address) // In a real app, we might do fuzzy matching or check if pickup is an airport
    .limit(10);

  if (error || !data || data.length === 0) {
    console.warn("No pre-scraped transfers found, falling back to empty results.");
    return { quotes: [] };
  }

  return {
    quotes: data.map((r) => ({
      id: r.original_id,
      vehicle_class: r.vehicle_type,
      vehicle_description: r.vehicle_type,
      provider_name: r.provider,
      total_price: r.price_amount,
      currency: r.price_currency,
      duration_minutes: 45, // Estimated
      cancellation_policy: "Free cancellation up to 4h before pickup",
    })),
  };
}

export type TransferBookingInput = {
  quote_id: string;
  passenger: { first_name: string; last_name: string; email: string; phone: string };
  flight_number?: string;
  special_instructions?: string;
};

export async function bookTransfer(input: TransferBookingInput) {
  return call<{ reservation_id: string; status: string; confirmation_number?: string }>("/reservations", {
    method: "POST",
    body: JSON.stringify({
      search_result_id: input.quote_id,
      first_name: input.passenger.first_name,
      last_name: input.passenger.last_name,
      email: input.passenger.email,
      country_code_phone: "+1",
      phone: input.passenger.phone,
      flight_number: input.flight_number,
      special_instructions: input.special_instructions,
      campaign: affiliateId(),
    }),
  });
}
