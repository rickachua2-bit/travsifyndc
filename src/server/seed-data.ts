import { 
  syncTours, 
  syncTransfers, 
  syncRentals, 
  syncVisas,
  syncInsurance
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
  console.log(`[Seeder] Starting global warm-up for ${TOP_50_COUNTRIES.length} countries...`);
  
  // Seed global insurance once (country-agnostic)
  await syncInsurance();

  // We process in small batches to avoid hitting Firecrawl rate limits too hard
  const batchSize = 5;
  for (let i = 0; i < TOP_50_COUNTRIES.length; i += batchSize) {
    const batch = TOP_50_COUNTRIES.slice(i, i + batchSize);
    console.log(`[Seeder] Processing batch: ${batch.join(", ")}`);
    
    // Trigger syncs in parallel for the batch
    await Promise.all([
      syncTours(batch),
      syncTransfers(batch),
      syncRentals(batch),
      syncVisas(batch)
    ]);
    
    console.log(`[Seeder] Batch complete. ${i + batch.length}/${TOP_50_COUNTRIES.length} countries synced.`);
  }
  
  console.log("[Seeder] Global warm-up complete!");
}

