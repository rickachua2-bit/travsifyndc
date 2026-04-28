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
                    required: ["title", "price", "id", "url"]
                  }
                }
              }
            }
          }
        })
      });
      const data = await response.json();
      if (!data.success) continue;
      const extracted = data.data.extract.tours || [];
      for (const tour of extracted) {
        await supabase.from("tours").upsert({
          title: tour.title,
          description: tour.description || "",
          price_amount: tour.price,
          price_currency: tour.currency || "USD",
          image_url: tour.image || "",
          location: tour.location || country,
          country: country,
          original_id: `gyg-${tour.id}`,
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
            }
          }
        })
      });
      const data = await response.json();
      if (!data.success) continue;
      const extracted = data.data.extract.transfers || [];
      for (const item of extracted) {
        await supabase.from("car_transfers").upsert({
          vehicle_type: item.vehicle_type,
          price_amount: item.price,
          price_currency: item.currency || "USD",
          location: item.location || country,
          country: country,
          original_id: `mozio-${item.id || Math.random().toString(36).slice(2)}`,
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
            }
          }
        })
      });
      const data = await response.json();
      if (!data.success) continue;
      const extracted = data.data.extract.rentals || [];
      for (const item of extracted) {
        await supabase.from("car_rentals").upsert({
          vehicle_name: item.vehicle_name,
          price_amount: item.price,
          price_currency: item.currency || "USD",
          location: country,
          country: country,
          original_id: `rc-${item.id || Math.random().toString(36).slice(2)}`,
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
    rentals: "car_rentals"
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
        console.log(`[Auto-Fetch] Successfully populated ${syncKey}`);
      } catch (err) {
        console.error(`[Auto-Fetch] Failed for ${syncKey}:`, err);
      } finally {
        activeSyncs.delete(syncKey);
      }
    })();
  }
}
