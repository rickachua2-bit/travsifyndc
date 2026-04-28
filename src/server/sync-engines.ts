import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const firecrawlKey = process.env.FIRECRAWL_API_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

interface TourData {
  title: string;
  description: string;
  price_amount: number;
  price_currency: string;
  image_url: string;
  location: string;
  country: string;
  original_id: string;
  affiliate_url: string;
  provider: string;
}

export async function syncTours(countries: string[]) {
  const results = [];
  for (const country of countries) {
    console.log(`Syncing tours for: ${country}...`);
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${firecrawlKey}` },
        body: JSON.stringify({
          url: `https://www.getyourguide.com/s?q=${encodeURIComponent(country)}`,
          formats: ["extract"],
          extract: {
            schema: {
              type: "object",
              properties: {
                tours: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      price: { type: "number" },
                      currency: { type: "string" },
                      image: { type: "string" },
                      id: { type: "string" },
                      url: { type: "string" },
                      location: { type: "string" }
                    },
                    required: ["title", "price", "url"]
                  }
                }
              }
            },
            prompt: "Extract all available tour packages. Aim for at least 15 items if present on the page."
          }
        })
      });
      const data = await response.json();
      if (!data.success) {
        console.warn(`[SyncTours] Firecrawl failed for ${country}:`, data.error || "Unknown error");
        continue;
      }
      const extracted = data.data.extract.tours || [];
      for (const tour of extracted) {
        // Deterministic ID if original ID is missing
        const tourId = tour.id || Buffer.from(tour.title + tour.url).toString("base64").slice(0, 16);
        await supabase.from("tours").upsert({
          title: tour.title,
          description: tour.description || "",
          price_amount: tour.price,
          price_currency: tour.currency || "USD",
          image_url: tour.image || "",
          location: tour.location || country,
          country: country,
          original_id: `gyg-${tourId}`,
          affiliate_url: tour.url.startsWith("http") ? tour.url : `https://www.getyourguide.com${tour.url}`,
          provider: "GetYourGuide"
        }, { onConflict: "original_id" });
      }
      results.push({ country, count: extracted.length });
    } catch (err) { console.error(`Failed ${country}:`, err); }
  }
  return results;
}

export async function syncTransfers(countries: string[]) {
  const results = [];
  for (const country of countries) {
    console.log(`Syncing transfers for: ${country}...`);
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${firecrawlKey}` },
        body: JSON.stringify({
          url: `https://www.mozio.com/en-us/search/?start=${encodeURIComponent(country)}`,
          formats: ["extract"],
          extract: {
            schema: {
              type: "object",
              properties: {
                transfers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      vehicle_type: { type: "string" },
                      price: { type: "number" },
                      currency: { type: "string" },
                      provider: { type: "string" },
                      image: { type: "string" },
                      id: { type: "string" },
                      location: { type: "string" }
                    },
                    required: ["vehicle_type", "price"]
                  }
                }
              }
            },
            prompt: "Extract all available car transfer options, including vehicle type and pricing."
          }
        })
      });
      const data = await response.json();
      if (!data.success) {
        console.warn(`[SyncTransfers] Firecrawl failed for ${country}`);
        continue;
      }
      const extracted = data.data.extract.transfers || [];
      for (const item of extracted) {
        const transferId = item.id || Buffer.from(item.vehicle_type + item.price).toString("base64").slice(0, 16);
        await supabase.from("car_transfers").upsert({
          vehicle_type: item.vehicle_type,
          price_amount: item.price,
          price_currency: item.currency || "USD",
          location: item.location || country,
          country: country,
          original_id: `mozio-${transferId}`,
          image_url: item.image || "",
          provider: item.provider || "Mozio",
          affiliate_url: `https://www.mozio.com/en-us/search/?start=${encodeURIComponent(country)}`
        }, { onConflict: "original_id" });
      }
      results.push({ country, count: extracted.length });
    } catch (err) { console.error(`Failed ${country}:`, err); }
  }
  return results;
}

export async function syncInsurance() {
  console.log("Syncing insurance packages...");
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${firecrawlKey}` },
      body: JSON.stringify({
        url: "https://safetywing.com/nomad-insurance/pricing",
        formats: ["extract"],
        extract: {
          schema: {
            type: "object",
            properties: {
              packages: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    daily_rate: { type: "number" },
                    weekly_rate: { type: "number" },
                    description: { type: "string" }
                  },
                  required: ["name", "daily_rate"]
                }
              }
            }
          }
        }
      })
    });
    const data = await response.json();
    if (!data.success) return [];
    const extracted = data.data.extract.packages || [];
    for (const pkg of extracted) {
      await supabase.from("insurance_packages").upsert({
        name: pkg.name,
        daily_rate: pkg.daily_rate,
        weekly_rate: pkg.weekly_rate,
        description: pkg.description || "",
        original_id: `sw-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`,
        provider: "SafetyWing",
        affiliate_url: "https://safetywing.com/nomad-insurance"
      }, { onConflict: "original_id" });
    }
    return [{ vertical: "insurance", count: extracted.length }];
  } catch (err) { console.error("Insurance sync failed:", err); return []; }
}

export async function syncVisas(countries: string[]) {
  const results = [];
  for (const country of countries) {
    console.log(`Syncing visas for: ${country}...`);
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${firecrawlKey}` },
        body: JSON.stringify({
          url: `https://apply.joinsherpa.com/travel-restrictions?destination=${encodeURIComponent(country)}`,
          formats: ["extract"],
          extract: {
            schema: {
              type: "object",
              properties: {
                visa_details: {
                  type: "object",
                  properties: {
                    requirement_summary: { type: "string" },
                    fee_amount: { type: "number" },
                    processing_time: { type: "string" }
                  }
                }
              }
            }
          }
        })
      });
      const data = await response.json();
      if (!data.success) continue;
      const item = data.data.extract.visa_details;
      if (item) {
        await supabase.from("evisas").upsert({
          destination: country,
          country: country,
          requirement_summary: item.requirement_summary || "See details",
          price_amount: item.fee_amount || 0,
          processing_time: item.processing_time || "Varies",
          original_id: `sherpa-${country.toLowerCase()}`,
          provider: "Sherpa",
          affiliate_url: `https://apply.joinsherpa.com/travel-restrictions?destination=${encodeURIComponent(country)}`
        }, { onConflict: "original_id" });
      }
      results.push({ country, success: !!item });
    } catch (err) { console.error(`Failed ${country}:`, err); }
  }
  return results;
}

export async function syncRentals(countries: string[]) {
  const results = [];
  for (const country of countries) {
    console.log(`Syncing rentals for: ${country}...`);
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${firecrawlKey}` },
        body: JSON.stringify({
          url: `https://www.rentalcars.com/en/search-results/?locationName=${encodeURIComponent(country)}`,
          formats: ["extract"],
          extract: {
            schema: {
              type: "object",
              properties: {
                rentals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      vehicle_name: { type: "string" },
                      price: { type: "number" },
                      currency: { type: "string" },
                      provider: { type: "string" },
                      image: { type: "string" },
                      id: { type: "string" }
                    },
                    required: ["vehicle_name", "price"]
                  }
                }
              }
            },
            prompt: "Extract all car rental listings. Get at least 15-20 vehicles if available."
          }
        })
      });
      const data = await response.json();
      if (!data.success) {
        console.warn(`[SyncRentals] Firecrawl failed for ${country}`);
        continue;
      }
      const extracted = data.data.extract.rentals || [];
      for (const item of extracted) {
        const rentalId = item.id || Buffer.from(item.vehicle_name + item.price).toString("base64").slice(0, 16);
        await supabase.from("car_rentals").upsert({
          vehicle_name: item.vehicle_name,
          price_amount: item.price,
          price_currency: item.currency || "USD",
          location: country,
          country: country,
          original_id: `rc-${rentalId}`,
          image_url: item.image || "",
          provider: item.provider || "RentalCars",
          affiliate_url: `https://www.rentalcars.com/en/search-results/?locationName=${encodeURIComponent(country)}`
        }, { onConflict: "original_id" });
      }
      results.push({ country, count: extracted.length });
    } catch (err) { console.error(`Failed ${country}:`, err); }
  }
  return results;
}

// Simple in-memory lock to prevent duplicate syncs in the same process
const activeSyncs = new Set<string>();

export async function ensureDataExists(vertical: string, country: string) {
  const tableMap: Record<string, string> = {
    tours: "tours",
    transfers: "car_transfers",
    visas: "evisas",
    rentals: "car_rentals",
    insurance: "insurance_packages"
  };

  const table = tableMap[vertical];
  if (!table) return;

  const syncKey = `${vertical}:${country.toLowerCase()}`;
  if (activeSyncs.has(syncKey)) return;

  // Check if we have data
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("country", country);

  if (!count || count === 0) {
    console.log(`[Auto-Fetch] No data for ${syncKey}. Starting background sync...`);
    
    activeSyncs.add(syncKey);

    // NON-BLOCKING: We do NOT await these. We let them run in the background.
    (async () => {
      try {
        if (vertical === "tours") await syncTours([country]);
        if (vertical === "transfers") await syncTransfers([country]);
        if (vertical === "visas") await syncVisas([country]);
        if (vertical === "rentals") await syncRentals([country]);
        if (vertical === "insurance") await syncInsurance();
        console.log(`[Auto-Fetch] Successfully populated ${syncKey}`);
      } catch (err) {
        console.error(`[Auto-Fetch] Failed for ${syncKey}:`, err);
      } finally {
        activeSyncs.delete(syncKey);
      }
    })();
  }
}

export async function backfillInventory() {
  console.log("[Backfill] Ensuring all verticals have at least 50 high-quality records...");
  
  const verticals = [
    { table: "tours", vertical: "tours", prefix: "gyg-seed-", count: 0 },
    { table: "car_transfers", vertical: "transfers", prefix: "mozio-seed-", count: 0 },
    { table: "car_rentals", vertical: "rentals", prefix: "rc-seed-", count: 0 },
    { table: "insurance_packages", vertical: "insurance", prefix: "sw-seed-", count: 0 },
    { table: "evisas", vertical: "visas", prefix: "sherpa-seed-", count: 0 }
  ];

  for (const v of verticals) {
    const { count, error } = await supabase
      .from(v.table)
      .select("*", { count: "exact", head: true });
    
    if (error) {
      console.error(`[Backfill] Error checking ${v.table}:`, error.message);
      continue;
    }

    const currentCount = count || 0;
    if (currentCount < 50) {
      const needed = 50 - currentCount;
      console.log(`[Backfill] Table ${v.table} only has ${currentCount} records. Generating ${needed} high-quality seeds...`);
      
      for (let i = 0; i < needed; i++) {
        const country = ["France", "Japan", "USA", "UK", "Nigeria", "UAE", "Germany", "Italy", "Spain", "Canada"][i % 10];
        const seedId = `${v.prefix}${i}-${Date.now()}`;
        
        if (v.vertical === "tours") {
          await supabase.from("tours").upsert({
            title: `Premium ${country} City Tour - Option ${i+1}`,
            description: `Explore the best of ${country} with our expert local guides. Includes transport and entry fees.`,
            price_amount: 45 + (i * 10),
            price_currency: "USD",
            location: country,
            country: country,
            original_id: seedId,
            affiliate_url: "https://www.getyourguide.com",
            provider: "GetYourGuide (Seeded)"
          });
        } else if (v.vertical === "transfers") {
          await supabase.from("car_transfers").upsert({
            vehicle_type: i % 2 === 0 ? "Executive Sedan" : "Private Minivan",
            price_amount: 35 + (i * 5),
            price_currency: "USD",
            location: country,
            country: country,
            original_id: seedId,
            provider: "Mozio (Seeded)",
            affiliate_url: "https://www.mozio.com"
          });
        } else if (v.vertical === "rentals") {
          await supabase.from("car_rentals").upsert({
            vehicle_name: ["Toyota Corolla", "BMW 3 Series", "Mercedes C-Class", "Range Rover", "Tesla Model 3"][i % 5],
            price_amount: 55 + (i * 12),
            price_currency: "USD",
            location: country,
            country: country,
            original_id: seedId,
            provider: "RentalCars (Seeded)",
            affiliate_url: "https://www.rentalcars.com"
          });
        } else if (v.vertical === "insurance") {
          await supabase.from("insurance_packages").upsert({
            name: `Global Nomad Protect ${i+1}`,
            daily_rate: 1.5 + (i * 0.2),
            weekly_rate: 10 + (i * 1.5),
            description: `Comprehensive travel and medical insurance for nomads visiting ${country} and beyond.`,
            original_id: seedId,
            provider: "SafetyWing (Seeded)",
            affiliate_url: "https://safetywing.com"
          });
        } else if (v.vertical === "visas") {
          await supabase.from("evisas").upsert({
            destination: country,
            country: country,
            requirement_summary: "Online application required. 3-5 days processing time.",
            price_amount: 50 + (i * 5),
            processing_time: "3-5 business days",
            original_id: seedId,
            provider: "Sherpa (Seeded)",
            affiliate_url: "https://apply.joinsherpa.com"
          });
        }
      }
    } else {
      console.log(`[Backfill] Table ${v.table} already healthy with ${currentCount} records.`);
    }
  }
  console.log("[Backfill] Inventory audit and backfill complete.");
}
