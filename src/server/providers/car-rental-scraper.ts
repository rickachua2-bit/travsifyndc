/**
 * Car rental scraper — uses Firecrawl to aggregate quotes from AVIS, Hertz
 * and Enterprise. Same architectural pattern as insurance/transfers:
 *   - Instant deterministic fallback for the first call
 *   - Background scrape that fills the cache
 *   - Fully white-labeled (no brand names exposed)
 *
 * Customer never sees AVIS/Hertz/Enterprise. We pick the cheapest per car
 * class, brand it as "Travsify Partner", and ops books the actual rental
 * on whichever site won that class after the customer has paid from wallet
 * or card.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const FIRECRAWL_TIMEOUT_MS = 8000;
const CAR_CACHE_HOURS = 6;

export type CarRentalScrapeInput = {
  pickup_location: string;       // city/airport name or IATA
  dropoff_location: string;
  pickup_date: string;           // YYYY-MM-DD
  dropoff_date: string;
  driver_age: number;
};

export type NormalizedCarRentalQuote = {
  id: string;
  car_class: "economy" | "compact" | "midsize" | "suv" | "premium" | "minivan";
  car_description: string;       // e.g. "Compact · Toyota Corolla or similar"
  example_model: string;         // generic, e.g. "Toyota Corolla or similar"
  transmission: "automatic" | "manual";
  passengers: number;
  bags: number;
  air_conditioning: boolean;
  unlimited_mileage: boolean;
  total_price: number;
  currency: "USD";
  per_day_price: number;
  rental_days: number;
  pickup_location: string;
  dropoff_location: string;
  cancellation_policy: string;
  provider_name: string;         // ALWAYS "Travsify Partner"
  /** Internal use only — never surfaced. */
  _internal_underwriter: string;
};

const PROVIDER_PAGE_SCHEMA = {
  type: "object",
  properties: {
    cars: {
      type: "array",
      items: {
        type: "object",
        properties: {
          car_name: { type: "string" },
          car_class: { type: "string", description: "economy / compact / midsize / suv / premium / minivan" },
          example_model: { type: "string" },
          transmission: { type: "string" },
          passengers: { type: "number" },
          bags: { type: "number" },
          air_conditioning: { type: "boolean" },
          unlimited_mileage: { type: "boolean" },
          price_total_usd: { type: "number" },
          price_per_day_usd: { type: "number" },
          cancellation_policy: { type: "string" },
        },
      },
    },
  },
  required: ["cars"],
};

function searchUrl(provider: "avis" | "hertz" | "enterprise", input: CarRentalScrapeInput): string {
  const pu = encodeURIComponent(input.pickup_location);
  const dp = encodeURIComponent(input.dropoff_location);
  if (provider === "avis") {
    return `https://www.avis.com/en/reservation/reserve-a-car?pickupLocation=${pu}&dropoffLocation=${dp}&pickupDate=${input.pickup_date}&dropoffDate=${input.dropoff_date}`;
  }
  if (provider === "hertz") {
    return `https://www.hertz.com/rentacar/reservation/?pickupLocation=${pu}&returnLocation=${dp}&pickupDate=${input.pickup_date}&returnDate=${input.dropoff_date}&driverAge=${input.driver_age}`;
  }
  return `https://www.enterprise.com/en/car-rental/locations.html?pickupLocation=${pu}&dropoffLocation=${dp}&pickupDate=${input.pickup_date}&dropoffDate=${input.dropoff_date}`;
}

type RawCar = {
  car_name?: string;
  car_class?: string;
  example_model?: string;
  transmission?: string;
  passengers?: number;
  bags?: number;
  air_conditioning?: boolean;
  unlimited_mileage?: boolean;
  price_total_usd?: number;
  price_per_day_usd?: number;
  cancellation_policy?: string;
};

async function firecrawlScrape(url: string, prompt: string): Promise<RawCar[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FIRECRAWL_TIMEOUT_MS);
  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: [{ type: "json", schema: PROVIDER_PAGE_SCHEMA, prompt }],
        onlyMainContent: true,
        waitFor: 1500,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Firecrawl ${res.status}`);
    const json = (await res.json()) as { data?: { json?: { cars?: RawCar[] } } };
    const cars = json.data?.json?.cars ?? [];
    return Array.isArray(cars) ? cars : [];
  } finally {
    clearTimeout(timer);
  }
}

function normalizeClass(raw?: string): NormalizedCarRentalQuote["car_class"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("minivan") || s.includes("van")) return "minivan";
  if (s.includes("suv") || s.includes("4x4") || s.includes("crossover")) return "suv";
  if (s.includes("premium") || s.includes("luxury") || s.includes("full-size") || s.includes("fullsize")) return "premium";
  if (s.includes("midsize") || s.includes("mid-size") || s.includes("intermediate")) return "midsize";
  if (s.includes("compact")) return "compact";
  return "economy";
}

function classDefaults(cls: NormalizedCarRentalQuote["car_class"]): { example: string; pax: number; bags: number; perDay: number } {
  if (cls === "economy")  return { example: "Kia Rio or similar",        pax: 4, bags: 2, perDay: 28 };
  if (cls === "compact")  return { example: "Toyota Corolla or similar",  pax: 5, bags: 2, perDay: 35 };
  if (cls === "midsize")  return { example: "Hyundai Sonata or similar",  pax: 5, bags: 3, perDay: 45 };
  if (cls === "suv")      return { example: "Toyota RAV4 or similar",     pax: 5, bags: 4, perDay: 65 };
  if (cls === "premium")  return { example: "Mercedes-Benz E-Class or similar", pax: 5, bags: 3, perDay: 110 };
  return { example: "Chrysler Pacifica or similar", pax: 7, bags: 5, perDay: 95 };
}

function classLabel(cls: NormalizedCarRentalQuote["car_class"]): string {
  return cls === "economy"  ? "Economy"
    :    cls === "compact"  ? "Compact"
    :    cls === "midsize"  ? "Midsize"
    :    cls === "suv"      ? "SUV"
    :    cls === "premium"  ? "Premium"
    :    "Minivan";
}

function rentalDays(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

function sanitize(c: RawCar): RawCar | null {
  const total = Number(c.price_total_usd);
  if (!Number.isFinite(total) || total <= 0 || total > 20000) return null;
  return {
    car_name: c.car_name?.slice(0, 80),
    car_class: c.car_class?.slice(0, 30),
    example_model: c.example_model?.slice(0, 80),
    transmission: c.transmission?.toLowerCase().includes("manual") ? "manual" : "automatic",
    passengers: Number.isFinite(Number(c.passengers)) ? Math.max(2, Math.min(15, Number(c.passengers))) : undefined,
    bags: Number.isFinite(Number(c.bags)) ? Math.max(0, Math.min(10, Number(c.bags))) : undefined,
    air_conditioning: c.air_conditioning ?? true,
    unlimited_mileage: c.unlimited_mileage ?? true,
    price_total_usd: Number(total.toFixed(2)),
    price_per_day_usd: Number.isFinite(Number(c.price_per_day_usd)) ? Number(Number(c.price_per_day_usd).toFixed(2)) : undefined,
    cancellation_policy: (c.cancellation_policy || "Free cancellation up to 48 hours before pickup").slice(0, 200),
  };
}

export async function fetchAndNormalizeCarRentals(input: CarRentalScrapeInput): Promise<NormalizedCarRentalQuote[]> {
  const days = rentalDays(input.pickup_date, input.dropoff_date);
  const prompt =
    `Extract all available rental car options from ${input.pickup_location} on ${input.pickup_date} ` +
    `returning to ${input.dropoff_location} on ${input.dropoff_date} for a driver aged ${input.driver_age}. ` +
    `Convert all prices to USD.`;

  const sources: Array<"avis" | "hertz" | "enterprise"> = ["avis", "hertz", "enterprise"];
  const results = await Promise.allSettled(
    sources.map((s) => firecrawlScrape(searchUrl(s, input), prompt).then((cars) => ({ source: s, cars }))),
  );

  type Item = { source: string; c: NonNullable<ReturnType<typeof sanitize>> };
  const collected: Item[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const raw of r.value.cars) {
      const s = sanitize(raw);
      if (s) collected.push({ source: r.value.source, c: s });
    }
  }
  if (collected.length === 0) return deterministicFallback(input);

  // Cheapest per class.
  const byClass = new Map<NormalizedCarRentalQuote["car_class"], Item>();
  for (const item of collected) {
    const cls = normalizeClass(item.c.car_class);
    const existing = byClass.get(cls);
    if (!existing || (item.c.price_total_usd ?? 0) < (existing.c.price_total_usd ?? 0)) {
      byClass.set(cls, item);
    }
  }

  return Array.from(byClass.entries()).map(([cls, item], idx) => {
    const def = classDefaults(cls);
    const total = Number((item.c.price_total_usd ?? def.perDay * days).toFixed(2));
    return {
      id: `cr_${cls}_${idx}_${Date.now().toString(36)}`,
      car_class: cls,
      car_description: `${classLabel(cls)} · ${item.c.example_model || def.example}`,
      example_model: item.c.example_model || def.example,
      transmission: (item.c.transmission as "automatic" | "manual") || "automatic",
      passengers: item.c.passengers ?? def.pax,
      bags: item.c.bags ?? def.bags,
      air_conditioning: item.c.air_conditioning ?? true,
      unlimited_mileage: item.c.unlimited_mileage ?? true,
      total_price: total,
      currency: "USD" as const,
      per_day_price: Number((total / days).toFixed(2)),
      rental_days: days,
      pickup_location: input.pickup_location,
      dropoff_location: input.dropoff_location,
      cancellation_policy: item.c.cancellation_policy ?? "Free cancellation up to 48 hours before pickup",
      provider_name: "Travsify Partner",
      _internal_underwriter: item.source,
    };
  }).sort((a, b) => a.total_price - b.total_price);
}

function deterministicFallback(input: CarRentalScrapeInput): NormalizedCarRentalQuote[] {
  const days = rentalDays(input.pickup_date, input.dropoff_date);
  const classes: NormalizedCarRentalQuote["car_class"][] = ["economy", "compact", "midsize", "suv", "premium", "minivan"];
  return classes.map((cls, idx) => {
    const def = classDefaults(cls);
    const total = Number((def.perDay * days).toFixed(2));
    return {
      id: `cr_fallback_${cls}_${idx}`,
      car_class: cls,
      car_description: `${classLabel(cls)} · ${def.example}`,
      example_model: def.example,
      transmission: "automatic" as const,
      passengers: def.pax,
      bags: def.bags,
      air_conditioning: true,
      unlimited_mileage: true,
      total_price: total,
      currency: "USD" as const,
      per_day_price: def.perDay,
      rental_days: days,
      pickup_location: input.pickup_location,
      dropoff_location: input.dropoff_location,
      cancellation_policy: "Free cancellation up to 48 hours before pickup",
      provider_name: "Travsify Partner",
      _internal_underwriter: "fallback",
    };
  });
}

function ageBucket(age: number): number {
  if (age < 25) return 24;
  if (age < 30) return 29;
  if (age < 65) return 64;
  return 99;
}
function locKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

export async function getOrScrapeCarRentals(input: CarRentalScrapeInput): Promise<NormalizedCarRentalQuote[]> {
  const pl = locKey(input.pickup_location);
  const dl = locKey(input.dropoff_location);
  const ab = ageBucket(input.driver_age);

  const { data: cached } = await supabaseAdmin
    .from("car_rental_quote_cache")
    .select("quotes, last_scraped_at")
    .eq("pickup_location", pl)
    .eq("dropoff_location", dl)
    .eq("pickup_date", input.pickup_date)
    .eq("dropoff_date", input.dropoff_date)
    .eq("driver_age_bucket", ab)
    .maybeSingle();

  const cutoff = Date.now() - CAR_CACHE_HOURS * 3600 * 1000;
  if (cached && new Date(cached.last_scraped_at).getTime() > cutoff) {
    const quotes = cached.quotes as unknown as NormalizedCarRentalQuote[];
    if (Array.isArray(quotes) && quotes.length > 0) return quotes;
  }

  scheduleBackgroundScrape(input, pl, dl, ab);
  return deterministicFallback(input);
}

function scheduleBackgroundScrape(
  input: CarRentalScrapeInput, pl: string, dl: string, ab: number,
): void {
  void (async () => {
    try {
      const fresh = await fetchAndNormalizeCarRentals(input);
      if (!fresh.some((q) => q._internal_underwriter !== "fallback")) return;
      await supabaseAdmin
        .from("car_rental_quote_cache")
        .insert({
          pickup_location: pl,
          dropoff_location: dl,
          pickup_date: input.pickup_date,
          dropoff_date: input.dropoff_date,
          driver_age_bucket: ab,
          quotes: JSON.parse(JSON.stringify(fresh)) as never,
          last_scraped_at: new Date().toISOString(),
        });
    } catch (e) {
      console.warn("background car rental scrape failed:", (e as Error).message);
    }
  })();
}
