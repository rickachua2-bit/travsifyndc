/**
 * GetYourGuide scraper — uses Firecrawl to gather tour & activity listings
 * from getyourguide.com and viator.com in parallel, normalizes them into a
 * unified white-label TourOffer shape, and caches by (destination, date-bucket,
 * travelers-bucket).
 *
 * White-label rules:
 *   - Operator names are NEVER surfaced (we present them as "Travsify Partner").
 *   - The original underwriter is kept on `_internal_underwriter` for ops only.
 *
 * Performance: instant deterministic fallback, background cache fill.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const FIRECRAWL_TIMEOUT_MS = 9000;
const TOUR_CACHE_HOURS = 12;

export type TourScrapeInput = {
  destination: string;       // free-text city / destination
  date_from?: string;        // YYYY-MM-DD
  date_to?: string;
  travelers: number;
};

export type NormalizedTourOffer = {
  id: string;
  title: string;
  abstract: string;
  duration: string;
  price: number;
  currency: "USD";
  rating: number;
  review_count: number;
  photo: string | null;
  city: string;
  category: "city_tour" | "day_trip" | "experience" | "ticket" | "transfer";
  /** Internal use only — never surfaced in the partner/customer API. */
  _internal_underwriter: string;
};

const PAGE_SCHEMA = {
  type: "object",
  properties: {
    tours: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          abstract: { type: "string", description: "Short description / first highlights" },
          duration: { type: "string", description: "e.g. 3 hours, Full day" },
          price_usd: { type: "number", description: "Price per person in USD" },
          rating: { type: "number" },
          review_count: { type: "number" },
          photo_url: { type: "string" },
          category: { type: "string", description: "city tour, day trip, experience, ticket, transfer" },
        },
      },
    },
  },
  required: ["tours"],
};

function searchUrl(provider: "gyg" | "viator", input: TourScrapeInput): string {
  const q = encodeURIComponent(input.destination);
  if (provider === "gyg") {
    const date = input.date_from ? `&date_from=${input.date_from}${input.date_to ? `&date_to=${input.date_to}` : ""}` : "";
    return `https://www.getyourguide.com/s/?q=${q}${date}`;
  }
  return `https://www.viator.com/searchResults/all?text=${q}`;
}

type RawTour = {
  title?: string;
  abstract?: string;
  duration?: string;
  price_usd?: number;
  rating?: number;
  review_count?: number;
  photo_url?: string;
  category?: string;
};

async function firecrawlScrape(url: string, prompt: string): Promise<RawTour[]> {
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
        formats: [{ type: "json", schema: PAGE_SCHEMA, prompt }],
        onlyMainContent: true,
        waitFor: 1500,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Firecrawl ${res.status}`);
    const json = (await res.json()) as { data?: { json?: { tours?: RawTour[] } } };
    const tours = json.data?.json?.tours ?? [];
    return Array.isArray(tours) ? tours : [];
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCategory(raw?: string): NormalizedTourOffer["category"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("transfer")) return "transfer";
  if (s.includes("ticket") || s.includes("admission")) return "ticket";
  if (s.includes("day trip") || s.includes("excursion")) return "day_trip";
  if (s.includes("experience") || s.includes("workshop") || s.includes("class")) return "experience";
  return "city_tour";
}

function sanitize(t: RawTour): RawTour | null {
  const price = Number(t.price_usd);
  if (!t.title || !Number.isFinite(price) || price <= 0 || price > 5000) return null;
  return {
    title: String(t.title).slice(0, 200),
    abstract: String(t.abstract || "").slice(0, 400),
    duration: String(t.duration || "Flexible duration").slice(0, 60),
    price_usd: Number(price.toFixed(2)),
    rating: Number.isFinite(Number(t.rating)) ? Math.max(0, Math.min(5, Number(t.rating))) : 4.5,
    review_count: Number.isFinite(Number(t.review_count)) ? Math.max(0, Math.min(100000, Number(t.review_count))) : 100,
    photo_url: typeof t.photo_url === "string" && t.photo_url.startsWith("http") ? t.photo_url : undefined,
    category: t.category?.slice(0, 40),
  };
}

export async function fetchAndNormalizeTours(input: TourScrapeInput): Promise<NormalizedTourOffer[]> {
  const prompt =
    `Extract all bookable tours, activities, attractions and experiences for ${input.destination}` +
    (input.date_from ? ` on dates ${input.date_from}${input.date_to ? ` to ${input.date_to}` : ""}` : "") +
    `. Convert all per-person prices to USD. Include title, short abstract, duration, price, rating, review count, photo URL, and category.`;

  const sources: Array<"gyg" | "viator"> = ["gyg", "viator"];
  const results = await Promise.allSettled(
    sources.map((s) => firecrawlScrape(searchUrl(s, input), prompt).then((qs) => ({ source: s, qs }))),
  );

  type SaneItem = { source: string; t: NonNullable<ReturnType<typeof sanitize>> };
  const collected: SaneItem[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const raw of r.value.qs) {
      const sane = sanitize(raw);
      if (sane) collected.push({ source: r.value.source, t: sane });
    }
  }

  if (collected.length === 0) return deterministicFallback(input);

  // De-dupe by lowercased title; keep cheapest of duplicates.
  const byTitle = new Map<string, SaneItem>();
  for (const item of collected) {
    const key = (item.t.title || "").toLowerCase().trim();
    const existing = byTitle.get(key);
    if (!existing || (item.t.price_usd ?? 0) < (existing.t.price_usd ?? 0)) {
      byTitle.set(key, item);
    }
  }

  return Array.from(byTitle.values()).slice(0, 24).map((item, idx) => {
    const category = normalizeCategory(item.t.category);
    return {
      id: `tour_${idx}_${Date.now().toString(36)}`,
      title: item.t.title || "Tour",
      abstract: item.t.abstract || "",
      duration: item.t.duration || "Flexible",
      price: Number((item.t.price_usd ?? 0).toFixed(2)),
      currency: "USD" as const,
      rating: item.t.rating ?? 4.5,
      review_count: item.t.review_count ?? 100,
      photo: item.t.photo_url || unsplashPhoto(input.destination, category, idx),
      city: input.destination,
      category,
      _internal_underwriter: item.source,
    };
  }).sort((a, b) => a.price - b.price);
}

/** Build a deterministic Unsplash Source URL keyed to destination + category.
 *  Unsplash Source returns a real photograph for any keyword and never 404s,
 *  so every fallback card gets a relevant image. */
function unsplashPhoto(destination: string, kind: NormalizedTourOffer["category"], idx: number): string {
  const kindKw: Record<NormalizedTourOffer["category"], string> = {
    city_tour: "city,landmark",
    day_trip: "landscape,travel",
    experience: "food,culture",
    ticket: "monument,architecture",
    transfer: "car,travel",
  };
  const kw = encodeURIComponent(`${destination},${kindKw[kind]}`);
  // sig forces a stable but distinct image per card
  return `https://source.unsplash.com/800x600/?${kw}&sig=${idx}`;
}

function deterministicFallback(input: TourScrapeInput): NormalizedTourOffer[] {
  const seed = (input.destination.length * 7) % 30;
  const base = 35 + seed;
  const tiers: Array<{ kind: NormalizedTourOffer["category"]; title: (c: string) => string; price: number; duration: string; rating: number; reviews: number }> = [
    { kind: "city_tour",  title: (c) => `${c} Highlights Walking Tour`,         price: base,           duration: "3 hours",  rating: 4.7, reviews: 1820 },
    { kind: "ticket",     title: (c) => `${c} Top Attractions Skip-the-Line`,   price: base + 14,      duration: "Flexible", rating: 4.6, reviews: 2640 },
    { kind: "day_trip",   title: (c) => `Day Trip from ${c}`,                   price: base * 2.4,     duration: "Full day", rating: 4.8, reviews: 980 },
    { kind: "experience", title: (c) => `${c} Local Food & Culture Experience`, price: base + 28,      duration: "4 hours",  rating: 4.9, reviews: 540 },
    { kind: "city_tour",  title: (c) => `${c} Night Lights Tour`,               price: base + 9,       duration: "2 hours",  rating: 4.5, reviews: 720 },
    { kind: "experience", title: (c) => `Private Half-Day in ${c}`,             price: base * 3.2,     duration: "5 hours",  rating: 4.9, reviews: 210 },
  ];
  return tiers.map((tier, idx) => ({
    id: `tour_fallback_${idx}`,
    title: tier.title(input.destination),
    abstract: `Curated ${tier.kind.replace("_", " ")} in ${input.destination}. Hand-picked operators, instant voucher delivery.`,
    duration: tier.duration,
    price: Number((tier.price * input.travelers).toFixed(2)),
    currency: "USD" as const,
    rating: tier.rating,
    review_count: tier.reviews,
    photo: unsplashPhoto(input.destination, tier.kind, idx),
    city: input.destination,
    category: tier.kind,
    _internal_underwriter: "fallback",
  }));
}

// ---- Cache helpers ----------------------------------------------------------

function destinationKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}
function dateBucket(from?: string, to?: string): string {
  if (!from) return "any";
  return `${from}_${to || from}`;
}
function travelersBucket(n: number): number {
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 6) return 6;
  return 10;
}

export async function getOrScrapeTours(input: TourScrapeInput): Promise<NormalizedTourOffer[]> {
  const dk = destinationKey(input.destination);
  const db = dateBucket(input.date_from, input.date_to);
  const tb = travelersBucket(input.travelers);

  const { data: cached } = await supabaseAdmin
    .from("tour_quote_cache")
    .select("tours, last_scraped_at")
    .eq("destination_key", dk)
    .eq("date_bucket", db)
    .eq("travelers_bucket", tb)
    .maybeSingle();

  const cutoff = Date.now() - TOUR_CACHE_HOURS * 3600 * 1000;
  if (cached && new Date(cached.last_scraped_at).getTime() > cutoff) {
    const tours = cached.tours as unknown as NormalizedTourOffer[];
    if (Array.isArray(tours) && tours.length > 0) return tours;
  }

  scheduleBackgroundScrape(input, dk, db, tb);
  return deterministicFallback(input);
}

function scheduleBackgroundScrape(
  input: TourScrapeInput,
  dk: string, db: string, tb: number,
): void {
  void (async () => {
    try {
      const fresh = await fetchAndNormalizeTours(input);
      if (!fresh.some((t) => t._internal_underwriter !== "fallback")) return;
      await supabaseAdmin
        .from("tour_quote_cache")
        .insert({
          destination_key: dk,
          date_bucket: db,
          travelers_bucket: tb,
          tours: JSON.parse(JSON.stringify(fresh)) as never,
          last_scraped_at: new Date().toISOString(),
        });
    } catch (e) {
      console.warn("background tour scrape failed:", (e as Error).message);
    }
  })();
}
