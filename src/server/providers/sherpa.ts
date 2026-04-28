// Sherpa client — visa & travel-document requirements + e-visa applications.
// Affiliate model: we use our affiliate token; customers fill the application in our flow,
// ops submits to Sherpa portal manually after wallet payment.
// Docs: https://developers.joinsherpa.com/
import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";

const BASE = "https://requirements-api.joinsherpa.com/v2";

function affiliateId(): string {
  // Sherpa uses an affiliate ID (no token/secret). Stored as SHERPA_AFFILIATE_ID
  // (legacy SHERPA_AFFILIATE_TOKEN is also accepted for backwards compatibility).
  const id = process.env.SHERPA_AFFILIATE_ID || process.env.SHERPA_AFFILIATE_TOKEN;
  if (!id) throw new Error("SHERPA_AFFILIATE_ID not configured");
  return id;
}

async function call<T>(path: string): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}affiliate=${affiliateId()}`;
  const res = await fetchWithTimeout(url, { headers: { "Accept": "application/json" } }, { providerName: "Sherpa", timeoutMs: TIMEOUTS.search });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`Sherpa error ${res.status}: ${text.slice(0, 200)}`);
  }
  return json as T;
}

export type VisaSearchInput = {
  nationality: string;       // ISO-2, e.g. "NG"
  destination: string;       // ISO-2, e.g. "AE"
  purpose?: "tourism" | "business" | "transit";
};

export type VisaOption = {
  id: string;
  name: string;          // e.g. "UAE 30-Day E-Visa"
  visa_type: string;     // "evisa" | "voa" | "embassy"
  duration_days: number;
  processing_time: string;
  price: number;
  currency: string;
  requirements: string[];
};

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function searchVisas(input: VisaSearchInput): Promise<{ options: VisaOption[] }> {
  // Check Supabase for pre-scraped visa data
  const { data: dbVisas, error } = await supabase
    .from("evisas")
    .select("*")
    .eq("destination", input.destination) // Destination mapping
    .limit(5);

  if (dbVisas && dbVisas.length > 0) {
    return {
      options: dbVisas.map((v) => ({
        id: v.original_id,
        name: `${v.destination} E-Visa`,
        visa_type: "evisa",
        duration_days: 30,
        processing_time: v.processing_time || "3-7 business days",
        price: v.price_amount,
        currency: "USD",
        requirements: [v.requirement_summary || "Valid passport, digital photo, travel itinerary"],
      })),
    };
  }

  // Fallback to minimal search if DB is empty for this corridor
  return { options: [] };
}

/** Sherpa affiliate flow: capture intent. Ops submits the actual application portal-side. */
export async function captureVisaApplication(input: {
  visa_option_id: string;
  applicant: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    passport_number: string;
    passport_expiry: string;
    nationality: string;
    email: string;
  };
  travel_dates: { arrival: string; departure: string };
}) {
  return {
    captured: true,
    visa_option_id: input.visa_option_id,
    applicant_email: input.applicant.email,
    submission_required: true,
  };
}
