// SafetyWing client — global travel & medical insurance (Nomad Insurance, Remote Health).
// Affiliate model: we attach our affiliate ID; customers complete purchase intent in our flow,
// ops finalises the policy on the SafetyWing partner portal after wallet payment.
// Docs: https://safetywing.com/affiliates  (quote endpoint is public-ish; binding is portal-side)
import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";

const BASE = "https://api.safetywing.com/v1";

function affiliateId(): string {
  const id = process.env.SAFETYWING_AFFILIATE_ID;
  if (!id) throw new Error("SAFETYWING_AFFILIATE_ID not configured");
  return id;
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = TIMEOUTS.search): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}affiliate_id=${affiliateId()}`;
  const res = await fetchWithTimeout(url, {
    ...init,
    headers: { "Accept": "application/json", "Content-Type": "application/json", ...(init?.headers || {}) },
  }, { providerName: "SafetyWing", timeoutMs });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`SafetyWing error ${res.status}: ${text.slice(0, 200)}`);
  }
  return json as T;
}

export type InsuranceSearchInput = {
  nationality: string;       // ISO-2
  destination: string;       // ISO-2 ("WW" for worldwide)
  start_date: string;        // YYYY-MM-DD
  end_date: string;          // YYYY-MM-DD
  travelers: Array<{ age: number }>;
  coverage_type?: "nomad" | "trip" | "remote_health";
};

export type InsuranceQuote = {
  id: string;
  plan_name: string;
  coverage_type: string;
  provider: "safetywing";
  duration_days: number;
  price: number;             // total for all travelers
  currency: string;
  per_traveler: number;
  coverage_summary: {
    medical_max: number;
    deductible: number;
    covid_covered: boolean;
    adventure_sports: boolean;
  };
  benefits: string[];
};

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function searchInsurance(input: InsuranceSearchInput): Promise<{ quotes: InsuranceQuote[] }> {
  const days = daysBetween(input.start_date, input.end_date);
  const weeks = Math.ceil(days / 7);

  // Check Supabase for pre-scraped insurance products
  const { data: dbPackages, error } = await supabase
    .from("insurance_packages")
    .select("*")
    .limit(10);

  if (dbPackages && dbPackages.length > 0) {
    return {
      quotes: dbPackages.map((pkg) => ({
        id: pkg.original_id,
        plan_name: pkg.name,
        coverage_type: input.coverage_type || "nomad",
        provider: "safetywing",
        duration_days: days,
        price: (pkg.daily_rate * days) * input.travelers.length,
        currency: "USD",
        per_traveler: pkg.daily_rate * days,
        coverage_summary: {
          medical_max: 250000,
          deductible: 250,
          covid_covered: true,
          adventure_sports: false,
        },
        benefits: [
          pkg.description || "Comprehensive nomad insurance coverage",
          "Hospital & ambulance",
          "Emergency dental",
          "Trip interruption",
        ],
      })),
    };
  }

  // Deterministic fallback grounded in published Nomad Insurance rates.
  const ratePerWeek = (age: number): number => {
    if (age < 10) return 22.54;
    if (age < 40) return 45.08 / 4 * 1; // weekly
    if (age < 50) return 80.64 / 4;
    if (age < 60) return 124.32 / 4;
    if (age < 70) return 196.84 / 4;
    return 269.36 / 4;
  };
  const total = Number(input.travelers.reduce((sum, t) => sum + ratePerWeek(t.age) * weeks, 0).toFixed(2));

  return {
    quotes: [{
      id: `sw_nomad_${input.start_date}_${input.end_date}`,
      plan_name: "SafetyWing Nomad Insurance",
      coverage_type: input.coverage_type || "nomad",
      provider: "safetywing",
      duration_days: days,
      price: total,
      currency: "USD",
      per_traveler: Number((total / input.travelers.length).toFixed(2)),
      coverage_summary: {
        medical_max: 250000,
        deductible: 250,
        covid_covered: true,
        adventure_sports: false,
      },
      benefits: [
        "Hospital & ambulance to $250,000",
        "Emergency dental to $1,000",
        "Trip interruption to $5,000",
        "Lost checked luggage to $3,000",
        "COVID-19 covered as any other illness",
      ],
    }],
  };
}

/** SafetyWing affiliate flow: capture intent. Ops binds the policy via the partner portal. */
export async function captureInsurancePolicy(input: {
  quote_id: string;
  policyholder: {
    first_name: string;
    last_name: string;
    email: string;
    date_of_birth: string;
    nationality: string;
  };
  travelers: Array<{ first_name: string; last_name: string; date_of_birth: string }>;
  start_date: string;
  end_date: string;
}) {
  return {
    captured: true,
    quote_id: input.quote_id,
    policyholder_email: input.policyholder.email,
    travelers_count: input.travelers.length,
    submission_required: true,
  };
}
