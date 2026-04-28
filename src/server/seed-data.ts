import { createClient } from "@supabase/supabase-js";
import {
  syncTours,
  syncTransfers,
  syncRentals,
  syncVisas,
  syncInsurance,
  backfillInventory,
} from "./sync-engines";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export const TOP_50_COUNTRIES = [
  "Nigeria", "United Kingdom", "United States", "United Arab Emirates", "France",
  "Germany", "Italy", "Spain", "Canada", "Australia",
  "Japan", "South Africa", "Kenya", "Ghana", "Egypt",
  "Turkey", "Saudi Arabia", "Qatar", "Singapore", "Malaysia",
  "Thailand", "Indonesia", "Brazil", "Mexico", "Argentina",
  "China", "India", "South Korea", "Switzerland", "Netherlands",
  "Belgium", "Sweden", "Norway", "Denmark", "Finland",
  "Portugal", "Greece", "Ireland", "Austria", "Poland",
  "Israel", "Vietnam", "Philippines", "New Zealand", "Morocco",
  "Ethiopia", "Rwanda", "Senegal", "Tanzania", "Uganda",
];

// A country/vertical is considered "fresh" if scraped within this window.
// Re-running global warm-up will SKIP fresh combos and only fetch NEW data.
const FRESHNESS_WINDOW_DAYS = 7;

const VERTICAL_TABLES: Array<{ vertical: "tours" | "transfers" | "rentals" | "visas"; table: string }> = [
  { vertical: "tours", table: "tours" },
  { vertical: "transfers", table: "car_transfers" },
  { vertical: "rentals", table: "car_rentals" },
  { vertical: "visas", table: "evisas" },
];

/**
 * For a given vertical, return the subset of `countries` that DO NOT yet have
 * fresh data (i.e. either no rows for the country, or all rows older than the
 * freshness window). This guarantees re-runs of the global warm-up always
 * fetch genuinely NEW content rather than re-scraping countries we already
 * have covered.
 */
async function filterStaleCountries(table: string, countries: string[]): Promise<string[]> {
  const cutoff = new Date(Date.now() - FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const stale: string[] = [];
  for (const country of countries) {
    // Count rows for this country that are still considered fresh.
    // `created_at` is present on every inventory table.
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("country", country)
      .gte("created_at", cutoff);
    if (error) {
      console.warn(`[Seeder] freshness check failed for ${table}/${country}:`, error.message);
      stale.push(country); // err on the side of refetching
      continue;
    }
    if (!count || count === 0) stale.push(country);
  }
  return stale;
}

/**
 * Bulk Seeder: iterates the top 50 countries and fetches FRESH data for each
 * vertical, skipping anything we already pulled within the freshness window.
 */
export async function seedGlobalData() {
  const startTime = Date.now();
  console.log(`[Seeder] Starting INCREMENTAL global warm-up (skip data <${FRESHNESS_WINDOW_DAYS}d old)…`);

  try {
    // 1. Insurance is country-agnostic — refresh once if stale.
    const cutoff = new Date(Date.now() - FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count: insFresh } = await supabase
      .from("insurance_packages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoff);
    if (!insFresh || insFresh === 0) {
      console.log("[Seeder] Insurance stale — refreshing…");
      await syncInsurance();
    } else {
      console.log(`[Seeder] Insurance fresh (${insFresh} rows) — skipping.`);
    }

    // 2. Per-vertical, work out which countries are still stale.
    const staleByVertical: Record<string, string[]> = {};
    for (const v of VERTICAL_TABLES) {
      staleByVertical[v.vertical] = await filterStaleCountries(v.table, TOP_50_COUNTRIES);
      console.log(
        `[Seeder] ${v.vertical}: ${staleByVertical[v.vertical].length}/${TOP_50_COUNTRIES.length} countries need fresh data`,
      );
    }

    // 3. Process country batches, only firing the verticals that need it.
    const allTodo = new Set<string>([
      ...staleByVertical.tours,
      ...staleByVertical.transfers,
      ...staleByVertical.rentals,
      ...staleByVertical.visas,
    ]);
    const todoList = TOP_50_COUNTRIES.filter((c) => allTodo.has(c));

    if (todoList.length === 0) {
      console.log("[Seeder] All countries already fresh — nothing to scrape. Running backfill audit only.");
    }

    const batchSize = 8;
    for (let i = 0; i < todoList.length; i += batchSize) {
      const batch = todoList.slice(i, i + batchSize);
      console.log(`[Seeder] [Batch ${i / batchSize + 1}] Processing: ${batch.join(", ")}`);

      const syncs = batch.map(async (country) => {
        const tasks: Promise<unknown>[] = [];
        if (staleByVertical.tours.includes(country)) tasks.push(syncTours([country]));
        if (staleByVertical.transfers.includes(country)) tasks.push(syncTransfers([country]));
        if (staleByVertical.rentals.includes(country)) tasks.push(syncRentals([country]));
        if (staleByVertical.visas.includes(country)) tasks.push(syncVisas([country]));
        try {
          return await Promise.all(tasks);
        } catch (e) {
          console.error(`[Seeder] Error syncing ${country}:`, e);
          return null;
        }
      });

      await Promise.all(syncs);

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `[Seeder] Progress: ${Math.min(i + batch.length, todoList.length)}/${todoList.length} stale countries. Elapsed: ${elapsed}s`,
      );
    }

    console.log("[Seeder] Primary crawl complete. Performing inventory audit + backfill…");
    await backfillInventory();

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Seeder] Global warm-up finished in ${totalTime}s. Stale countries scraped: ${todoList.length}.`);
  } catch (err) {
    console.error("[Seeder] CRITICAL SEEDER FAILURE:", err);
  }
}
