/**
 * Transfers scraper — uses Firecrawl to gather airport-transfer quotes from
 * three sources (Mozio, Kiwitaxi, Welcome Pickups) in parallel, normalizes
 * them into a unified white-label TransferQuote shape and caches by
 * (pickup, dropoff, datetime-bucket, passenger-bucket).
 *
 * White-label rules:
 *   - Provider/operator names are NEVER surfaced to the customer (set to "Travsify Partner").
 *   - The original underwriter is kept on `_internal_underwriter` for ops only.
 *
 * Performance: same pattern as insurance — instant deterministic fallback,
 * background cache fill. Caller never waits for Firecrawl.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const FIRECRAWL_TIMEOUT_MS = 8000;

// Transfer prices vary by datetime; cache for 6h is a sweet spot between
// freshness and Firecrawl cost.
const TRANSFER_CACHE_HOURS = 6;

export type TransferScrapeInput = {
  pickup_address: string;
  dropoff_address: string;
  pickup_datetime: string; // ISO 8601
  num_passengers: number;
};

export type NormalizedTransferQuote = {
  id: string;
  vehicle_class: "sedan" | "suv" | "van" | "minibus" | "luxury";
  vehicle_description: string; // white-label, e.g. "Standard Sedan · up to 3 pax"
  provider_name: string;       // ALWAYS "Travsify Partner" — no leaks
  total_price: number;
  currency: "USD";
  duration_minutes: number;
  cancellation_policy: string;
  /** Internal use only — never surfaced in the partner/customer API. */
  _internal_underwriter: string;
};

const PROVIDER_PAGE_SCHEMA = {
  type: "object",
  properties: {
    quotes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          vehicle_name: { type: "string", description: "Marketing vehicle name" },
          vehicle_class: { type: "string", description: "sedan / suv / van / minibus / luxury" },
          max_passengers: { type: "number" },
          price_total_usd: { type: "number" },
          duration_minutes: { type: "number" },
          cancellation_policy: { type: "string" },
        },
      },
    },
  },
  required: ["quotes"],
};

function searchUrl(provider: "mozio" | "kiwitaxi" | "welcome", input: TransferScrapeInput): string {
  const pu = encodeURIComponent(input.pickup_address);
  const dp = encodeURIComponent(input.dropoff_address);
  const dt = encodeURIComponent(input.pickup_datetime);
  if (provider === "mozio") {
    return `https://www.mozio.com/en-us/results?start_address=${pu}&end_address=${dp}&pickup_datetime=${dt}&num_passengers=${input.num_passengers}`;
  }
  if (provider === "kiwitaxi") {
    return `https://kiwitaxi.com/search?from=${pu}&to=${dp}&date=${dt}&pax=${input.num_passengers}`;
  }
  return `https://www.welcomepickups.com/search?pickup=${pu}&dropoff=${dp}&datetime=${dt}&passengers=${input.num_passengers}`;
}

type RawQuote = {
  vehicle_name?: string;
  vehicle_class?: string;
  max_passengers?: number;
  price_total_usd?: number;
  duration_minutes?: number;
  cancellation_policy?: string;
};

async function firecrawlScrape(url: string, prompt: string): Promise<RawQuote[]> {
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
    const json = (await res.json()) as { data?: { json?: { quotes?: RawQuote[] } } };
    const quotes = json.data?.json?.quotes ?? [];
    return Array.isArray(quotes) ? quotes : [];
  } finally {
    clearTimeout(timer);
  }
}

function normalizeClass(raw?: string, pax?: number): NormalizedTransferQuote["vehicle_class"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("luxury") || s.includes("premium") || s.includes("business")) return "luxury";
  if (s.includes("minibus") || s.includes("mini bus") || (pax && pax >= 12)) return "minibus";
  if (s.includes("van") || (pax && pax >= 7)) return "van";
  if (s.includes("suv")) return "suv";
  return "sedan";
}

function describeVehicle(cls: NormalizedTransferQuote["vehicle_class"], pax: number): string {
  const label = cls === "sedan" ? "Standard Sedan"
    : cls === "suv" ? "Premium SUV"
    : cls === "van" ? "Spacious Van"
    : cls === "minibus" ? "Group Minibus"
    : "Luxury Vehicle";
  return `${label} · up to ${pax} passenger${pax === 1 ? "" : "s"}`;
}

function sanitize(q: RawQuote): RawQuote | null {
  const total = Number(q.price_total_usd);
  if (!Number.isFinite(total) || total <= 0 || total > 5000) return null;
  return {
    vehicle_name: q.vehicle_name?.slice(0, 80) ?? "",
    vehicle_class: q.vehicle_class?.slice(0, 40),
    max_passengers: Number.isFinite(Number(q.max_passengers)) ? Math.max(1, Math.min(20, Number(q.max_passengers))) : undefined,
    price_total_usd: Number(total.toFixed(2)),
    duration_minutes: Number.isFinite(Number(q.duration_minutes)) ? Math.max(5, Math.min(720, Number(q.duration_minutes))) : 60,
    cancellation_policy: (q.cancellation_policy || "Free cancellation up to 4 hours before pickup").slice(0, 200),
  };
}

/** Pull from all 3 sources in parallel and pick the best quote per class. */
export async function fetchAndNormalizeTransfers(input: TransferScrapeInput): Promise<NormalizedTransferQuote[]> {
  const prompt =
    `Extract all available transfer/private-transport quotes from ${input.pickup_address} to ${input.dropoff_address} ` +
    `on ${input.pickup_datetime} for ${input.num_passengers} passenger(s). Convert all prices to USD.`;

  const sources: Array<"mozio" | "kiwitaxi" | "welcome"> = ["mozio", "kiwitaxi", "welcome"];
  const results = await Promise.allSettled(
    sources.map((s) => firecrawlScrape(searchUrl(s, input), prompt).then((qs) => ({ source: s, qs }))),
  );

  type SaneItem = { source: string; q: NonNullable<ReturnType<typeof sanitize>> };
  const collected: SaneItem[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const raw of r.value.qs) {
      const sane = sanitize(raw);
      if (sane) collected.push({ source: r.value.source, q: sane });
    }
  }

  if (collected.length === 0) return deterministicFallback(input);

  // Pick cheapest per vehicle class.
  const byClass = new Map<NormalizedTransferQuote["vehicle_class"], SaneItem>();
  for (const item of collected) {
    const cls = normalizeClass(item.q.vehicle_class, item.q.max_passengers);
    const existing = byClass.get(cls);
    if (!existing || (item.q.price_total_usd ?? 0) < (existing.q.price_total_usd ?? 0)) {
      byClass.set(cls, item);
    }
  }

  return Array.from(byClass.entries()).map(([cls, item], idx) => {
    const pax = item.q.max_passengers ?? defaultPax(cls);
    return {
      id: `tq_${cls}_${idx}_${Date.now().toString(36)}`,
      vehicle_class: cls,
      vehicle_description: describeVehicle(cls, pax),
      provider_name: "Travsify Partner",
      total_price: Number((item.q.price_total_usd ?? 0).toFixed(2)),
      currency: "USD" as const,
      duration_minutes: item.q.duration_minutes ?? 60,
      cancellation_policy: item.q.cancellation_policy ?? "Free cancellation up to 4 hours before pickup",
      _internal_underwriter: item.source,
    };
  }).sort((a, b) => a.total_price - b.total_price);
}

function defaultPax(cls: NormalizedTransferQuote["vehicle_class"]): number {
  if (cls === "sedan") return 3;
  if (cls === "suv") return 5;
  if (cls === "van") return 7;
  if (cls === "minibus") return 14;
  return 3;
}

/** Returns 4 deterministic class options scaled by passenger count. */
function deterministicFallback(input: TransferScrapeInput): NormalizedTransferQuote[] {
  const pax = input.num_passengers;
  const baseDistance = 35; // ~typical airport transfer minutes
  const tiers: Array<{ cls: NormalizedTransferQuote["vehicle_class"]; basePrice: number; durationOffset: number }> = [
    { cls: "sedan",   basePrice: 45, durationOffset: 0 },
    { cls: "suv",     basePrice: 65, durationOffset: 0 },
    { cls: "van",     basePrice: 85, durationOffset: 5 },
    { cls: "luxury",  basePrice: 120, durationOffset: -5 },
  ];
  // Filter by capacity.
  return tiers
    .filter(({ cls }) => defaultPax(cls) >= pax || cls === "luxury")
    .map(({ cls, basePrice, durationOffset }, idx) => ({
      id: `tq_fallback_${cls}_${idx}`,
      vehicle_class: cls,
      vehicle_description: describeVehicle(cls, defaultPax(cls)),
      provider_name: "Travsify Partner",
      total_price: Number(basePrice.toFixed(2)),
      currency: "USD" as const,
      duration_minutes: baseDistance + durationOffset,
      cancellation_policy: "Free cancellation up to 4 hours before pickup",
      _internal_underwriter: "fallback",
    }));
}

// ---- Cache helpers ----------------------------------------------------------

function bucketKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}
function datetimeBucket(iso: string): string {
  // bucket by hour-of-day to keep cardinality low
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 13);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}`;
}
function paxBucket(n: number): number {
  if (n <= 3) return 3;
  if (n <= 5) return 5;
  if (n <= 7) return 7;
  return 14;
}

import { ensureDataExists } from "@/server/sync-engines";

export async function getOrScrapeTransfers(input: TransferScrapeInput): Promise<NormalizedTransferQuote[]> {
  const pk = bucketKey(input.pickup_address);
  const dk = bucketKey(input.dropoff_address);
  const tb = datetimeBucket(input.pickup_datetime);
  const pb = paxBucket(input.num_passengers);

  // Trigger JIT sync if needed (using pickup location as country heuristic)
  ensureDataExists("transfers", input.pickup_address);

  // 1. Check synced 'car_transfers' table
  const { data: synced } = await supabaseAdmin
    .from("car_transfers")
    .select("*")
    .or(`pickup_location.ilike.%${input.pickup_address}%,dropoff_location.ilike.%${input.dropoff_address}%,country.ilike.%${input.pickup_address}%,country.ilike.%${input.dropoff_address}%`)
    .limit(10);

  if (synced && synced.length > 0) {
    return synced.map((q, idx) => ({
      id: q.original_id || `synced_${idx}`,
      vehicle_class: "sedan",
      vehicle_description: q.vehicle_type || "Standard Sedan",
      provider_name: "Travsify Partner",
      total_price: Number(q.price_amount),
      currency: "USD" as const,
      duration_minutes: 60,
      cancellation_policy: "Free cancellation up to 4 hours before pickup",
      _internal_underwriter: q.provider || "synced",
    }));
  }

  // 2. Check scrape cache
  const { data: cached } = await supabaseAdmin
    .from("transfer_quote_cache")
    .select("quotes, last_scraped_at")
    .eq("pickup_key", pk)
    .eq("dropoff_key", dk)
    .eq("datetime_bucket", tb)
    .eq("passengers_bucket", pb)
    .maybeSingle();

  const cutoff = Date.now() - TRANSFER_CACHE_HOURS * 3600 * 1000;
  if (cached && new Date(cached.last_scraped_at).getTime() > cutoff) {
    const quotes = cached.quotes as unknown as NormalizedTransferQuote[];
    if (Array.isArray(quotes) && quotes.length > 0) return quotes;
  }

  // 3. Background scrape
  scheduleBackgroundScrape(input, pk, dk, tb, pb);
  return deterministicFallback(input);
}


function scheduleBackgroundScrape(
  input: TransferScrapeInput,
  pk: string, dk: string, tb: string, pb: number,
): void {
  void (async () => {
    try {
      const fresh = await fetchAndNormalizeTransfers(input);
      if (!fresh.some((q) => q._internal_underwriter !== "fallback")) return;
      await supabaseAdmin
        .from("transfer_quote_cache")
        .insert({
          pickup_key: pk,
          dropoff_key: dk,
          datetime_bucket: tb,
          passengers_bucket: pb,
          quotes: JSON.parse(JSON.stringify(fresh)) as never,
          last_scraped_at: new Date().toISOString(),
        });
    } catch (e) {
      console.warn("background transfer scrape failed:", (e as Error).message);
    }
  })();
}
