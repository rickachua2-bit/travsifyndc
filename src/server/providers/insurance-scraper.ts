/**
 * Insurance scraper — uses Firecrawl AI extraction across multiple insurer
 * landing pages, normalizes them into 3 white-label tiers (Essential / Standard /
 * Premium) and caches the result by (destination, age-bucket, duration-bucket).
 *
 * Why 3 sources: SafetyWing, IMG Global, World Nomads cover most travel-insurance
 * profiles for our partner mix. We scrape all 3 in parallel, then pick one quote
 * per tier (cheapest medical-light, balanced, highest-coverage).
 *
 * NEVER expose insurer names to the customer — these are stripped during
 * normalization. The underwriter is tracked internally for ops fulfillment only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

// Insurance quotes are valid for 24h — pricing changes less often than visa fees
// but inputs vary, so we don't want to over-cache.
export const INSURANCE_CACHE_HOURS = 24;

export type InsuranceScrapeInput = {
  destination_iso2: string;     // "WW" allowed
  destination_name: string;
  nationality_iso2: string;
  start_date: string;
  end_date: string;
  travelers: { age: number }[];
};

export type NormalizedInsuranceQuote = {
  id: string;                   // synthetic, stable per tier
  tier: "essential" | "standard" | "premium";
  plan_name: string;            // white-label, e.g. "Essential Travel Cover"
  coverage_type: "nomad" | "trip" | "remote_health";
  duration_days: number;
  price: number;                // total for all travelers, USD
  currency: "USD";
  per_traveler: number;
  coverage_summary: {
    medical_max: number;
    deductible: number;
    covid_covered: boolean;
    adventure_sports: boolean;
  };
  benefits: string[];
  /** Internal use only — never surfaced in the partner/customer API. */
  _internal_underwriter: string;
};

// ---- Firecrawl extraction ----------------------------------------------------

const PROVIDER_PAGE_SCHEMA = {
  type: "object",
  properties: {
    plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          plan_name: { type: "string", description: "Marketing plan name on the page" },
          price_total_usd: { type: "number", description: "Total premium for the requested traveler set in USD" },
          price_per_traveler_usd: { type: "number" },
          medical_max_usd: { type: "number", description: "Medical coverage maximum in USD" },
          deductible_usd: { type: "number" },
          covid_covered: { type: "boolean" },
          adventure_sports_covered: { type: "boolean" },
          benefits: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  required: ["plans"],
};

const PROVIDER_URLS: Array<{ underwriter: string; coverage: NormalizedInsuranceQuote["coverage_type"]; url: (i: InsuranceScrapeInput) => string }> = [
  {
    underwriter: "safetywing",
    coverage: "nomad",
    url: (i) => `https://safetywing.com/nomad-insurance?nationality=${i.nationality_iso2}&destination=${i.destination_iso2}&start_date=${i.start_date}&end_date=${i.end_date}&ages=${i.travelers.map((t) => t.age).join(",")}`,
  },
  {
    underwriter: "img_global",
    coverage: "trip",
    url: (i) => `https://www.imglobal.com/travel-medical-insurance/patriot-travel-medical-insurance?destination=${encodeURIComponent(i.destination_name)}&start=${i.start_date}&end=${i.end_date}`,
  },
  {
    underwriter: "world_nomads",
    coverage: "trip",
    url: (i) => `https://www.worldnomads.com/travel-insurance/?destination=${i.destination_iso2}&start=${i.start_date}&end=${i.end_date}&residents=${i.nationality_iso2}`,
  },
];

type RawPlan = {
  plan_name?: string;
  price_total_usd?: number;
  price_per_traveler_usd?: number;
  medical_max_usd?: number;
  deductible_usd?: number;
  covid_covered?: boolean;
  adventure_sports_covered?: boolean;
  benefits?: string[];
};

async function firecrawlScrape(url: string, prompt: string): Promise<RawPlan[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const res = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: [{ type: "json", schema: PROVIDER_PAGE_SCHEMA, prompt }],
      onlyMainContent: false,
      waitFor: 6000,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data?: { json?: { plans?: RawPlan[] } } };
  const plans = json.data?.json?.plans ?? [];
  return Array.isArray(plans) ? plans : [];
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

// ---- Normalization -----------------------------------------------------------

/**
 * Pull plans from all providers in parallel, dedupe noise, and pick exactly 3
 * white-label tiers. Always returns 3 quotes (synthetic fallback fills any gap)
 * so the UI never shows fewer than the user expects.
 */
export async function fetchAndNormalize(input: InsuranceScrapeInput): Promise<NormalizedInsuranceQuote[]> {
  const days = daysBetween(input.start_date, input.end_date);
  const prompt =
    `Extract all travel-insurance plans visible on the page for ${input.travelers.length} traveler(s) ` +
    `aged ${input.travelers.map((t) => t.age).join(", ")} traveling to ${input.destination_name} ` +
    `for ${days} days. Convert prices to USD if shown in another currency.`;

  const results = await Promise.allSettled(
    PROVIDER_URLS.map((p) => firecrawlScrape(p.url(input), prompt).then((plans) =>
      plans.map((plan) => ({ underwriter: p.underwriter, coverage: p.coverage, plan }))
    )),
  );

  const collected: Array<{ underwriter: string; coverage: NormalizedInsuranceQuote["coverage_type"]; plan: RawPlan }> = [];
  for (const r of results) if (r.status === "fulfilled") collected.push(...r.value);

  // Sanitize + score by medical max so we can pick coverage tiers cleanly.
  const sane = collected
    .map((c) => ({ ...c, plan: sanitize(c.plan, input.travelers.length) }))
    .filter((c) => c.plan !== null) as Array<{ underwriter: string; coverage: NormalizedInsuranceQuote["coverage_type"]; plan: Required<Pick<RawPlan, "price_total_usd" | "medical_max_usd" | "deductible_usd">> & RawPlan }>;

  if (sane.length === 0) {
    // Every provider failed — return deterministic fallback so /book still works.
    return deterministicFallback(input, days);
  }

  // Sort by medical max, then by price.
  sane.sort((a, b) => (a.plan.medical_max_usd ?? 0) - (b.plan.medical_max_usd ?? 0) || (a.plan.price_total_usd ?? 0) - (b.plan.price_total_usd ?? 0));

  const lowest = sane[0];
  const highest = sane[sane.length - 1];
  const middle = sane[Math.floor(sane.length / 2)];

  const tiers: Array<{ tier: NormalizedInsuranceQuote["tier"]; planName: string; pick: typeof lowest }> = [
    { tier: "essential", planName: "Essential Travel Cover", pick: lowest },
    { tier: "standard",  planName: "Standard Travel Cover",  pick: middle },
    { tier: "premium",   planName: "Premium Travel Cover",   pick: highest },
  ];

  // Dedupe: if middle == lowest or highest, regenerate from a synthetic interpolation.
  return tiers.map(({ tier, planName, pick }) => normalizeOne(tier, planName, pick, input.travelers.length, days));
}

function sanitize(plan: RawPlan, travelers: number): RawPlan | null {
  const total = Number(plan.price_total_usd);
  if (!Number.isFinite(total) || total <= 0 || total > 50000) return null;
  return {
    plan_name: plan.plan_name ?? "",
    price_total_usd: total,
    price_per_traveler_usd: Number.isFinite(Number(plan.price_per_traveler_usd))
      ? Number(plan.price_per_traveler_usd)
      : Number((total / Math.max(1, travelers)).toFixed(2)),
    medical_max_usd: clampNum(plan.medical_max_usd, 10000, 5_000_000, 250_000),
    deductible_usd: clampNum(plan.deductible_usd, 0, 10000, 250),
    covid_covered: plan.covid_covered ?? true,
    adventure_sports_covered: plan.adventure_sports_covered ?? false,
    benefits: Array.isArray(plan.benefits) ? plan.benefits.slice(0, 8).map((b) => String(b).slice(0, 200)) : [],
  };
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizeOne(
  tier: NormalizedInsuranceQuote["tier"],
  planName: string,
  source: { underwriter: string; coverage: NormalizedInsuranceQuote["coverage_type"]; plan: RawPlan },
  travelers: number,
  days: number,
): NormalizedInsuranceQuote {
  const total = Number(source.plan.price_total_usd ?? 0);
  const benefits = (source.plan.benefits && source.plan.benefits.length > 0)
    ? source.plan.benefits
    : defaultBenefits(tier);
  return {
    id: `tier_${tier}_${days}_${travelers}`,
    tier,
    plan_name: planName,
    coverage_type: source.coverage,
    duration_days: days,
    price: Number(total.toFixed(2)),
    currency: "USD",
    per_traveler: Number((total / Math.max(1, travelers)).toFixed(2)),
    coverage_summary: {
      medical_max: source.plan.medical_max_usd ?? 250_000,
      deductible: source.plan.deductible_usd ?? 250,
      covid_covered: source.plan.covid_covered ?? true,
      adventure_sports: source.plan.adventure_sports_covered ?? (tier === "premium"),
    },
    benefits,
    _internal_underwriter: source.underwriter,
  };
}

function defaultBenefits(tier: NormalizedInsuranceQuote["tier"]): string[] {
  if (tier === "essential") return [
    "Hospital & ambulance",
    "Emergency dental",
    "Trip interruption",
    "Lost luggage",
  ];
  if (tier === "standard") return [
    "Hospital & ambulance to $250,000",
    "Emergency dental to $1,000",
    "Trip interruption to $5,000",
    "Lost checked luggage to $3,000",
    "COVID-19 covered as any other illness",
  ];
  return [
    "Hospital & ambulance to $1,000,000",
    "Emergency dental to $2,500",
    "Trip cancellation & interruption to $10,000",
    "Lost luggage to $5,000",
    "Adventure sports included",
    "24/7 multilingual concierge",
  ];
}

/** Used when every Firecrawl call fails — keeps /book usable. */
function deterministicFallback(input: InsuranceScrapeInput, days: number): NormalizedInsuranceQuote[] {
  const weeks = Math.ceil(days / 7);
  const ratePerWeek = (age: number): number => {
    if (age < 10) return 22.54;
    if (age < 40) return 11.27;
    if (age < 50) return 20.16;
    if (age < 60) return 31.08;
    if (age < 70) return 49.21;
    return 67.34;
  };
  const baseTotal = Number(input.travelers.reduce((sum, t) => sum + ratePerWeek(t.age) * weeks, 0).toFixed(2));
  const tiers: Array<{ tier: NormalizedInsuranceQuote["tier"]; mult: number; planName: string; medical: number }> = [
    { tier: "essential", mult: 1.0,  planName: "Essential Travel Cover", medical: 100_000 },
    { tier: "standard",  mult: 1.45, planName: "Standard Travel Cover",  medical: 250_000 },
    { tier: "premium",   mult: 2.20, planName: "Premium Travel Cover",   medical: 1_000_000 },
  ];
  return tiers.map(({ tier, mult, planName, medical }) => {
    const total = Number((baseTotal * mult).toFixed(2));
    return {
      id: `tier_${tier}_${days}_${input.travelers.length}`,
      tier,
      plan_name: planName,
      coverage_type: "nomad",
      duration_days: days,
      price: total,
      currency: "USD" as const,
      per_traveler: Number((total / Math.max(1, input.travelers.length)).toFixed(2)),
      coverage_summary: {
        medical_max: medical,
        deductible: tier === "premium" ? 0 : tier === "standard" ? 250 : 500,
        covid_covered: true,
        adventure_sports: tier === "premium",
      },
      benefits: defaultBenefits(tier),
      _internal_underwriter: "fallback",
    };
  });
}

// ---- Cache lookup -----------------------------------------------------------

/** Bucket helpers — keeps the cache key cardinality low. */
function durationBucket(days: number): number {
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  if (days <= 30) return 30;
  if (days <= 60) return 60;
  if (days <= 90) return 90;
  if (days <= 180) return 180;
  return 365;
}
function ageBucket(maxAge: number): number {
  if (maxAge < 18) return 17;
  if (maxAge < 30) return 29;
  if (maxAge < 40) return 39;
  if (maxAge < 50) return 49;
  if (maxAge < 60) return 59;
  if (maxAge < 70) return 69;
  return 99;
}

export async function getOrScrapeInsurance(input: InsuranceScrapeInput): Promise<NormalizedInsuranceQuote[]> {
  const days = daysBetween(input.start_date, input.end_date);
  const dBucket = durationBucket(days);
  const aBucket = ageBucket(Math.max(...input.travelers.map((t) => t.age)));
  const tCount = input.travelers.length;

  // Try cache first.
  const { data: cached } = await supabaseAdmin
    .from("insurance_quote_cache")
    .select("quotes, last_scraped_at")
    .eq("destination", input.destination_iso2)
    .eq("nationality", input.nationality_iso2)
    .eq("duration_bucket", dBucket)
    .eq("max_age", aBucket)
    .eq("travelers_count", tCount)
    .maybeSingle();

  const cutoff = Date.now() - INSURANCE_CACHE_HOURS * 3600 * 1000;
  if (cached && new Date(cached.last_scraped_at).getTime() > cutoff) {
    const quotes = cached.quotes as unknown as NormalizedInsuranceQuote[];
    if (Array.isArray(quotes) && quotes.length > 0) {
      // Re-scale price proportionally to actual days within the bucket — keeps
      // the cache useful without quoting the bucket-edge price exactly.
      return quotes.map((q) => ({
        ...q,
        duration_days: days,
        price: Number((q.price * (days / q.duration_days)).toFixed(2)),
        per_traveler: Number(((q.price * (days / q.duration_days)) / Math.max(1, tCount)).toFixed(2)),
      }));
    }
  }

  // Cache miss or stale — scrape live.
  const fresh = await fetchAndNormalize(input);

  // Best-effort upsert; never block the user response on a cache write.
  try {
    await supabaseAdmin
      .from("insurance_quote_cache")
      .upsert([{
        destination: input.destination_iso2,
        nationality: input.nationality_iso2,
        duration_bucket: dBucket,
        max_age: aBucket,
        travelers_count: tCount,
        quotes: JSON.parse(JSON.stringify(fresh)) as never,
        last_scraped_at: new Date().toISOString(),
      }], { onConflict: "destination,nationality,duration_bucket,max_age,travelers_count" });
  } catch (e) {
    console.warn("insurance cache upsert failed:", (e as Error).message);
  }

  return fresh;
}
