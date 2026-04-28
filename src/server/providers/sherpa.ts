// Sherpa client — visa & travel-document requirements + e-visa applications.
// Affiliate model: we use our affiliate token; customers fill the application in our flow,
// ops submits to Sherpa portal manually after wallet payment.
// Docs: https://developers.joinsherpa.com/
import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ensureDataExists } from "@/server/sync-engines";
import { COUNTRIES } from "@/data/countries";

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

/** Resolve an ISO-2 code OR a country name to the full country name stored in DB. */
function resolveCountryName(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 2) {
    const hit = COUNTRIES.find((c) => c.code.toUpperCase() === trimmed.toUpperCase());
    if (hit) return hit.name;
  }
  return trimmed;
}

export async function searchVisas(input: VisaSearchInput): Promise<{ options: VisaOption[] }> {
  const destinationName = resolveCountryName(input.destination);
  // auto-fetch if no visa data for this destination (using full name to match DB)
  ensureDataExists("visas", destinationName);

  // Check Supabase for pre-scraped visa data — try full name AND ISO-2 just in case.
  const { data: dbVisas, error } = await supabaseAdmin
    .from("evisas")
    .select("*")
    .or(
      `country.ilike.%${destinationName}%,destination_country.ilike.%${destinationName}%,destination.ilike.%${input.destination}%`,
    )
    .limit(5);

  if (error) throw new Error(`Visa inventory lookup failed: ${error.message}`);

  if (dbVisas && dbVisas.length > 0) {
    return {
      options: dbVisas.map((v) => ({
        id: v.original_id,
        name: `${v.destination_country || v.country || destinationName} ${v.visa_type || "E-Visa"}`,
        visa_type: (v.visa_type || "evisa").toLowerCase(),
        duration_days: 30,
        processing_time: v.processing_time_days
          ? `${v.processing_time_days} business days`
          : "3-7 business days",
        price: Number(v.price_amount) || 0,
        currency: v.price_currency || "USD",
        requirements:
          Array.isArray(v.full_requirements) && v.full_requirements.length > 0
            ? v.full_requirements
            : [v.requirement_summary || "Valid passport, digital photo, travel itinerary"],
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
