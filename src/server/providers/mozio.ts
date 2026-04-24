// Mozio client — affiliate API for airport transfers / car pickup.
// Affiliate model: we forward the search/quote and create the reservation server-side
// using our affiliate ID. The end customer NEVER sees Mozio — they stay in our flow.
// Docs: https://docs.mozio.com/  (REST-ish JSON API, key in `Authorization` header)
const BASE = "https://api.mozio.com/v2";

function key(): string {
  const k = process.env.MOZIO_API_KEY;
  if (!k) throw new Error("MOZIO_API_KEY not configured");
  return k;
}

function affiliateId(): string {
  return process.env.MOZIO_AFFILIATE_ID || "";
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "API-KEY": key(),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
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

export async function searchTransfers(input: TransferSearchInput): Promise<{ quotes: TransferQuote[] }> {
  const search = await call<{ search_id: string }>("/searches", {
    method: "POST",
    body: JSON.stringify({
      start_address: input.pickup_address,
      end_address: input.dropoff_address,
      mode: "one_way",
      pickup_datetime: input.pickup_datetime,
      num_passengers: input.num_passengers,
      currency: input.currency || "USD",
      campaign: affiliateId(),
    }),
  });
  const results = await call<{ results: Array<Record<string, unknown>> }>(`/searches/${search.search_id}/poll`);
  return {
    quotes: (results.results || []).map((r) => ({
      id: r.result_id as string,
      vehicle_class: r.vehicle_class as string,
      vehicle_description: (r.vehicle_description as string) || (r.vehicle_class as string),
      provider_name: r.provider_name as string,
      total_price: Number(r.total_price),
      currency: r.currency as string,
      duration_minutes: Number(r.estimated_duration_minutes || 0),
      cancellation_policy: (r.cancellation_policy as string) || "Free cancellation up to 4h before pickup",
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
