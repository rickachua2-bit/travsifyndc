/**
 * Sherpa scraper — uses Firecrawl's AI extraction to pull structured visa data
 * from public Sherpa product pages, then upserts into visa_products.
 *
 * IMPORTANT: This is best-effort scraping. Sherpa can change their HTML at any time.
 * Errors per corridor are recorded in visa_scrape_runs.errors so admins can see
 * what failed and re-run if needed.
 *
 * Markup formula (chosen by user): retail = round(base * 1.30 + 20)
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { VISA_CORRIDORS, buildSherpaUrl, type Corridor } from "@/server/data/visa-corridors";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

// Extraction schema we ask the LLM to populate from each page.
const EXTRACTION_PROMPT =
  "Extract every visa option offered on this page. For each visa return: " +
  "name (string), visa_type (one of: tourist, business, transit), " +
  "entry_type (one of: single, multiple), validity_days (integer), " +
  "max_stay_days (integer), processing_days_min (integer), processing_days_max (integer), " +
  "price_usd (number, the customer-facing visa fee in USD), " +
  "required_documents (array of short plain-English strings, max 8), " +
  "short_description (one sentence). " +
  "If a value is not stated on the page, omit it. Return an empty list if no visas are sold.";

type ExtractedVisa = {
  name?: string;
  visa_type?: string;
  entry_type?: string;
  validity_days?: number;
  max_stay_days?: number;
  processing_days_min?: number;
  processing_days_max?: number;
  price_usd?: number;
  required_documents?: string[];
  short_description?: string;
};

export function applyMarkup(baseUsd: number): number {
  // 30% + $20 fixed, rounded to nearest dollar
  return Math.round(baseUsd * 1.3 + 20);
}

async function scrapeOneCorridor(c: Corridor): Promise<ExtractedVisa[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const res = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: buildSherpaUrl(c),
      formats: [{ type: "json", prompt: EXTRACTION_PROMPT }],
      onlyMainContent: false,
      waitFor: 6000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: { json?: { visa_options?: ExtractedVisa[] } } };
  const visas = json.data?.json?.visa_options ?? [];
  return Array.isArray(visas) ? visas : [];
}

/** Sanitise extracted visa into a row we can upsert. Returns null if invalid. */
function toRow(c: Corridor, v: ExtractedVisa) {
  const base = Number(v.price_usd);
  if (!Number.isFinite(base) || base <= 0 || base > 5000) return null;

  const visaType = (v.visa_type || "tourist").toLowerCase().slice(0, 60);
  const entryType = v.entry_type === "multiple" ? "multiple" : "single";

  return {
    nationality: c.nationality_iso2,
    nationality_name: c.nationality_name,
    destination: c.destination_iso2,
    destination_name: c.destination_name,
    visa_type: visaType,
    entry_type: entryType,
    validity_days: clampInt(v.validity_days, 1, 7300, 30),
    max_stay_days: clampInt(v.max_stay_days, 1, 7300, 30),
    processing_days_min: clampInt(v.processing_days_min, 0, 180, 2),
    processing_days_max: clampInt(v.processing_days_max, 0, 365, 7),
    base_price: Number(base.toFixed(2)),
    retail_price: applyMarkup(base),
    currency: "USD",
    requirements: (v.required_documents ?? []).slice(0, 12).map((s) => String(s).slice(0, 200)),
    description: v.short_description ? String(v.short_description).slice(0, 2000) : null,
    sherpa_url: buildSherpaUrl(c),
    is_active: true,
    display_order: 0,
    last_scraped_at: new Date().toISOString(),
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Run a full scrape over the curated corridor list. Designed to be invoked
 * in the background (fire-and-forget) — the run row is updated as we go so
 * the admin UI can poll for progress.
 */
export async function runSherpaScrape(runId: string): Promise<void> {
  let scraped = 0;
  let upserted = 0;
  let failed = 0;
  const errors: Array<{ corridor: string; error: string }> = [];

  await supabaseAdmin
    .from("visa_scrape_runs")
    .update({ total_corridors: VISA_CORRIDORS.length })
    .eq("id", runId);

  for (const c of VISA_CORRIDORS) {
    const corridorLabel = `${c.nationality_iso2}->${c.destination_iso2}`;
    try {
      const visas = await scrapeOneCorridor(c);
      scraped += 1;

      for (const v of visas) {
        const row = toRow(c, v);
        if (!row) continue;
        const { error } = await supabaseAdmin
          .from("visa_products")
          .upsert(row, { onConflict: "nationality,destination,visa_type" });
        if (error) {
          errors.push({ corridor: corridorLabel, error: `upsert: ${error.message}` });
        } else {
          upserted += 1;
        }
      }
    } catch (e) {
      failed += 1;
      errors.push({ corridor: corridorLabel, error: (e as Error).message.slice(0, 300) });
    }

    // Heartbeat so the UI sees progress; also throttles request rate.
    await supabaseAdmin
      .from("visa_scrape_runs")
      .update({
        scraped_count: scraped,
        upserted_count: upserted,
        failed_count: failed,
        errors: errors.slice(-50), // keep tail
      })
      .eq("id", runId);

    // Throttle: 1 request / 1.2s — keeps us well under Sherpa's rate limits.
    await new Promise((r) => setTimeout(r, 1200));
  }

  await supabaseAdmin
    .from("visa_scrape_runs")
    .update({
      status: failed === VISA_CORRIDORS.length ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      scraped_count: scraped,
      upserted_count: upserted,
      failed_count: failed,
      errors,
    })
    .eq("id", runId);
}
