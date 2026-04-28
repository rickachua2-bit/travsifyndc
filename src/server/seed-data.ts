import { 
  syncTours, 
  syncTransfers, 
  syncRentals, 
  syncVisas,
  syncInsurance,
  backfillInventory
} from "./sync-engines";

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
  "Ethiopia", "Rwanda", "Senegal", "Tanzania", "Uganda"
];

/**
 * Bulk Seeder: Iterates through the top 50 countries and populates all verticals.
 * This ensures the platform is "warm" with data from day one.
 */
export async function seedGlobalData() {
  const startTime = Date.now();
  console.log(`[Seeder] Starting aggressive global warm-up for ${TOP_50_COUNTRIES.length} countries...`);
  
  try {
    // 1. Seed global insurance (country-agnostic)
    console.log("[Seeder] Syncing Insurance...");
    await syncInsurance();

    // 2. Main loop for country-specific verticals
    // We process in smaller batches to avoid hitting Firecrawl rate limits too hard,
    // but we use a slightly larger batch size to speed things up.
    const batchSize = 8;
    for (let i = 0; i < TOP_50_COUNTRIES.length; i += batchSize) {
      const batch = TOP_50_COUNTRIES.slice(i, i + batchSize);
      console.log(`[Seeder] [Batch ${i/batchSize + 1}] Processing: ${batch.join(", ")}`);
      
      // Trigger syncs in parallel for the batch. We use reflect to ensure one failure doesn't kill the batch.
      const syncs = batch.map(async (country) => {
        try {
          return await Promise.all([
            syncTours([country]),
            syncTransfers([country]),
            syncRentals([country]),
            syncVisas([country])
          ]);
        } catch (e) {
          console.error(`[Seeder] Error syncing ${country}:`, e);
          return null;
        }
      });

      await Promise.all(syncs);
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Seeder] Progress: ${Math.min(i + batch.length, TOP_50_COUNTRIES.length)}/50 countries. Elapsed: ${elapsed}s`);
    }

    console.log("[Seeder] Primary crawl complete. Performing final inventory audit and backfill...");
    await backfillInventory();
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Seeder] Global warm-up successfully finished in ${totalTime}s!`);
    
  } catch (err) {
    console.error("[Seeder] CRITICAL SEEDER FAILURE:", err);
  }
}

