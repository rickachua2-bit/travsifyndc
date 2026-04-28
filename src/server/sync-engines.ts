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
  original_id: string;
  affiliate_url: string;
  provider: string;
}

export async function syncTours(cities: string[]) {
  const results = [];

  for (const city of cities) {
    console.log(`Syncing tours for: ${city}...`);
    
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${firecrawlKey}`
        },
        body: JSON.stringify({
          url: `https://www.getyourguide.com/s?q=${encodeURIComponent(city)}`,
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
                      url: { type: "string" }
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
      
      if (!data.success) {
        console.error(`Firecrawl error for ${city}:`, data.error);
        continue;
      }

      const extractedTours = data.data.extract.tours || [];
      
      for (const tour of extractedTours) {
        const tourRecord: TourData = {
          title: tour.title,
          description: tour.description || "",
          price_amount: tour.price,
          price_currency: tour.currency || "USD",
          image_url: tour.image || "",
          location: city,
          original_id: `gyg-${tour.id}`,
          affiliate_url: tour.url.startsWith("http") ? tour.url : `https://www.getyourguide.com${tour.url}`,
          provider: "GetYourGuide"
        };

        const { error } = await supabase
          .from("tours")
          .upsert(tourRecord, { onConflict: "original_id" });

        if (error) console.error("Supabase upsert error:", error);
      }

      results.push({ city, count: extractedTours.length });
      
    } catch (err) {
      console.error(`Failed to sync ${city}:`, err);
    }
  }

  return results;
}
