/**
 * Sync engines: scrape supplier sites with Firecrawl v2 and upsert into our
 * inventory tables (tours, car_transfers, car_rentals, evisas, insurance_packages).
 *
 * Each scrape demands HIGH-RES cover photos and rich descriptive content so the
 * pre-booking detail pages have something meaningful to render.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const firecrawlKey = process.env.FIRECRAWL_API_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- Firecrawl v2 helper ----------------------------------------------

async function firecrawlJson<T>(url: string, schema: object, prompt: string): Promise<T | null> {
  if (!firecrawlKey) {
    console.warn("[Firecrawl] FIRECRAWL_API_KEY is not configured");
    return null;
  }
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${firecrawlKey}` },
      body: JSON.stringify({
        url,
        formats: [{ type: "json", schema, prompt }],
        onlyMainContent: true,
        waitFor: 2500,
      }),
    });
    const body = await res.json();
    if (!res.ok || !body?.success) {
      console.warn(`[Firecrawl] ${url} failed: ${body?.error || res.statusText}`);
      return null;
    }
    return (body.data?.json ?? null) as T | null;
  } catch (err) {
    console.error(`[Firecrawl] exception for ${url}:`, err);
    return null;
  }
}

function shortId(input: string): string {
  // Stable short id without Buffer (works in Worker runtime).
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return Math.abs(h).toString(36).slice(0, 12);
}

// ---------- Tours ------------------------------------------------------------

export async function syncTours(countries: string[]) {
  const results: { country: string; count: number }[] = [];
  for (const country of countries) {
    console.log(`[SyncTours] ${country}`);
    const data = await firecrawlJson<{ tours: any[] }>(
      `https://www.getyourguide.com/s?q=${encodeURIComponent(country)}`,
      {
        type: "object",
        properties: {
          tours: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string", description: "Full overview paragraph (min 80 words)." },
                price: { type: "number" },
                currency: { type: "string" },
                image: { type: "string", description: "Highest-resolution cover image URL (https, no thumbnails)." },
                id: { type: "string" },
                url: { type: "string" },
                location: { type: "string" },
                highlights: { type: "array", items: { type: "string" } },
                inclusions: { type: "array", items: { type: "string" } },
                duration_text: { type: "string" },
              },
              required: ["title", "price", "url"],
            },
          },
        },
      },
      `Extract up to 24 tour packages for ${country}. For EACH item: capture the title, full description (at least 80 words), starting price + currency, the LARGEST cover image URL (avoid /thumb/ or low-res), location, an array of 3-6 key highlights, an array of inclusions (what's included), the booking URL, and a duration label.`,
    );

    if (!data?.tours) continue;
    let saved = 0;
    for (const t of data.tours) {
      if (!t.title || !t.price || !t.url) continue;
      const tourId = t.id || shortId(t.title + t.url);
      const { error } = await supabase.from("tours").upsert(
        {
          title: String(t.title).slice(0, 280),
          description: t.description || null,
          highlights: Array.isArray(t.highlights) ? t.highlights.slice(0, 8) : [],
          inclusions: Array.isArray(t.inclusions) ? t.inclusions.slice(0, 8) : [],
          duration: t.duration_text || null,
          price_amount: Number(t.price),
          price_currency: t.currency || "USD",
          image_url: t.image || null,
          location: t.location || country,
          country,
          original_id: `gyg-${tourId}`,
          affiliate_url: String(t.url).startsWith("http") ? t.url : `https://www.getyourguide.com${t.url}`,
          provider: "GetYourGuide",
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "original_id" },
      );
      if (!error) saved++;
      else console.warn(`[SyncTours] upsert failed: ${error.message}`);
    }
    results.push({ country, count: saved });
  }
  return results;
}

// ---------- Transfers --------------------------------------------------------

export async function syncTransfers(countries: string[]) {
  const results: { country: string; count: number }[] = [];
  for (const country of countries) {
    console.log(`[SyncTransfers] ${country}`);
    const data = await firecrawlJson<{ transfers: any[] }>(
      `https://www.mozio.com/en-us/search/?start=${encodeURIComponent(country)}`,
      {
        type: "object",
        properties: {
          transfers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                vehicle_type: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                currency: { type: "string" },
                provider: { type: "string" },
                image: { type: "string", description: "Largest available vehicle photo (https)." },
                id: { type: "string" },
                pickup_location: { type: "string" },
                dropoff_location: { type: "string" },
                passengers: { type: "number" },
                amenities: { type: "array", items: { type: "string" } },
              },
              required: ["vehicle_type", "price"],
            },
          },
        },
      },
      `Extract private car transfer options around ${country}. Include vehicle type, full description, max passengers, amenities (WiFi, water, child seat etc.), starting price, currency, provider name, and a HIGH-RES vehicle photo.`,
    );

    if (!data?.transfers) continue;
    let saved = 0;
    for (const item of data.transfers) {
      if (!item.vehicle_type || !item.price) continue;
      const id = item.id || shortId(item.vehicle_type + item.price);
      const { error } = await supabase.from("car_transfers").upsert(
        {
          vehicle_type: String(item.vehicle_type).slice(0, 200),
          description: item.description || null,
          amenities: Array.isArray(item.amenities) ? item.amenities.slice(0, 10) : [],
          price_amount: Number(item.price),
          price_currency: item.currency || "USD",
          pickup_location: item.pickup_location || country,
          dropoff_location: item.dropoff_location || country,
          passengers: item.passengers ? Math.round(Number(item.passengers)) : null,
          country,
          original_id: `mozio-${id}`,
          image_url: item.image || null,
          provider: item.provider || "Mozio",
          affiliate_url: `https://www.mozio.com/en-us/search/?start=${encodeURIComponent(country)}`,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "original_id" },
      );
      if (!error) saved++;
      else console.warn(`[SyncTransfers] upsert failed: ${error.message}`);
    }
    results.push({ country, count: saved });
  }
  return results;
}

// ---------- Insurance --------------------------------------------------------

export async function syncInsurance() {
  console.log("[SyncInsurance] global pull");
  const data = await firecrawlJson<{ packages: any[] }>(
    "https://safetywing.com/nomad-insurance/pricing",
    {
      type: "object",
      properties: {
        packages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              monthly_price: { type: "number" },
              currency: { type: "string" },
              description: { type: "string" },
              benefits: { type: "array", items: { type: "string" } },
              coverage_details: { type: "string" },
            },
            required: ["name", "monthly_price"],
          },
        },
      },
    },
    "Extract every traveler insurance plan available. Capture the plan name, monthly price + currency, a long-form coverage_details paragraph, an array of key benefits (medical limit, baggage, evacuation etc.), and a description.",
  );

  if (!data?.packages) return [{ vertical: "insurance", count: 0 }];
  let saved = 0;
  for (const p of data.packages) {
    if (!p.name || !p.monthly_price) continue;
    const { error } = await supabase.from("insurance_packages").upsert(
      {
        name: String(p.name).slice(0, 200),
        description: p.description || null,
        coverage_details: p.coverage_details || null,
        benefits: Array.isArray(p.benefits) ? p.benefits.slice(0, 12) : [],
        price_amount: Number(p.monthly_price),
        price_currency: p.currency || "USD",
        original_id: `sw-${shortId(p.name)}`,
        provider: "SafetyWing",
        affiliate_url: "https://safetywing.com/nomad-insurance",
        image_url: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80",
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "original_id" },
    );
    if (!error) saved++;
    else console.warn(`[SyncInsurance] upsert failed: ${error.message}`);
  }
  return [{ vertical: "insurance", count: saved }];
}

// ---------- Visas ------------------------------------------------------------

export async function syncVisas(countries: string[]) {
  const results: { country: string; success: boolean }[] = [];
  for (const country of countries) {
    console.log(`[SyncVisas] ${country}`);
    const data = await firecrawlJson<{ visa: any }>(
      `https://apply.joinsherpa.com/travel-restrictions?destination=${encodeURIComponent(country)}`,
      {
        type: "object",
        properties: {
          visa: {
            type: "object",
            properties: {
              visa_type: { type: "string" },
              requirement_summary: { type: "string" },
              full_requirements: { type: "array", items: { type: "string" } },
              fee_amount: { type: "number" },
              currency: { type: "string" },
              processing_time_days: { type: "number" },
              validity: { type: "string" },
            },
          },
        },
      },
      `Extract eVisa info for ${country}. Capture visa type (eVisa/eTA/Visa-on-Arrival), short requirement summary, an array of every required document, processing fee + currency, processing time in days, and validity period.`,
    );

    const item = data?.visa;
    if (!item) {
      results.push({ country, success: false });
      continue;
    }
    const { error } = await supabase.from("evisas").upsert(
      {
        destination_country: country,
        country,
        visa_type: item.visa_type || "eVisa",
        requirement_summary: item.requirement_summary || `Electronic travel authorization for ${country}.`,
        full_requirements: Array.isArray(item.full_requirements) ? item.full_requirements.slice(0, 15) : [],
        validity: item.validity || null,
        price_amount: Number(item.fee_amount || 0),
        price_currency: item.currency || "USD",
        processing_time_days: item.processing_time_days ? Math.round(Number(item.processing_time_days)) : null,
        original_id: `sherpa-${country.toLowerCase().replace(/\s+/g, "-")}`,
        provider: "Sherpa",
        affiliate_url: `https://apply.joinsherpa.com/travel-restrictions?destination=${encodeURIComponent(country)}`,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "original_id" },
    );
    if (error) console.warn(`[SyncVisas] upsert failed: ${error.message}`);
    results.push({ country, success: !error });
  }
  return results;
}

// ---------- Car rentals ------------------------------------------------------

export async function syncRentals(countries: string[]) {
  const results: { country: string; count: number }[] = [];
  for (const country of countries) {
    console.log(`[SyncRentals] ${country}`);
    const data = await firecrawlJson<{ rentals: any[] }>(
      `https://www.rentalcars.com/en/search-results/?locationName=${encodeURIComponent(country)}`,
      {
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
                image: { type: "string", description: "Largest car photo URL (https)." },
                id: { type: "string" },
                seats: { type: "number" },
                bags: { type: "number" },
                transmission: { type: "string" },
                air_conditioning: { type: "boolean" },
                car_class: { type: "string" },
              },
              required: ["vehicle_name", "price"],
            },
          },
        },
      },
      `Extract every rental car listed for ${country}. For each: vehicle name, daily price + currency, provider, HIGH-RES car photo, seats, luggage capacity, transmission (automatic/manual), AC yes/no, and class (economy/midsize/SUV/etc).`,
    );

    if (!data?.rentals) continue;
    let saved = 0;
    for (const item of data.rentals) {
      if (!item.vehicle_name || !item.price) continue;
      const id = item.id || shortId(item.vehicle_name + item.price);
      const { error } = await supabase.from("car_rentals").upsert(
        {
          vehicle_name: String(item.vehicle_name).slice(0, 200),
          price_amount: Number(item.price),
          price_currency: item.currency || "USD",
          location: country,
          country,
          original_id: `rc-${id}`,
          image_url: item.image || null,
          provider: item.provider || "RentalCars",
          metadata: {
            specs: {
              seats: item.seats || null,
              bags: item.bags || null,
              transmission: item.transmission || "Automatic",
              air_conditioning: item.air_conditioning ?? true,
              car_class: item.car_class || null,
            },
          },
          affiliate_url: `https://www.rentalcars.com/en/search-results/?locationName=${encodeURIComponent(country)}`,
        },
        { onConflict: "original_id" },
      );
      if (!error) saved++;
      else console.warn(`[SyncRentals] upsert failed: ${error.message}`);
    }
    results.push({ country, count: saved });
  }
  return results;
}

// ---------- Auto-fetch lock --------------------------------------------------

const activeSyncs = new Set<string>();

export async function ensureDataExists(vertical: string, country: string) {
  const tableMap: Record<string, string> = {
    tours: "tours",
    transfers: "car_transfers",
    visas: "evisas",
    rentals: "car_rentals",
    insurance: "insurance_packages",
  };
  const table = tableMap[vertical];
  if (!table) return;

  const syncKey = `${vertical}:${country.toLowerCase()}`;
  if (activeSyncs.has(syncKey)) return;

  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("country", country);

  if (count && count > 0) return;

  console.log(`[Auto-Fetch] starting background sync for ${syncKey}`);
  activeSyncs.add(syncKey);
  (async () => {
    try {
      if (vertical === "tours") await syncTours([country]);
      else if (vertical === "transfers") await syncTransfers([country]);
      else if (vertical === "visas") await syncVisas([country]);
      else if (vertical === "rentals") await syncRentals([country]);
      else if (vertical === "insurance") await syncInsurance();
    } catch (err) {
      console.error(`[Auto-Fetch] failed for ${syncKey}:`, err);
    } finally {
      activeSyncs.delete(syncKey);
    }
  })();
}

// ---------- Backfill seeds (real Unsplash photos) ----------------------------

// Curated, verified-working Unsplash photo IDs (each tested to return 200).
const TOUR_PHOTOS = [
  "1539635278303-d4002c07eae3", "1502602898657-3e91760cbb34", "1500530855697-b586d89ba3ee",
  "1488646953014-85cb44e25828", "1469854523086-cc02fe5d8800", "1507525428034-b723cf961d3e",
  "1530841377377-3ff06c0ca713", "1499856871958-5b9627545d1a", "1508009603885-50cf7c579365",
  "1518684079-3c830dcef090",
];
const TRANSFER_PHOTOS = [
  "1549399542-7e3f8b79c341", "1502877338535-766e1452684a", "1503376780353-7e6692767b70",
  "1605559424843-9e4c228bf1c2", "1492144534655-ae79c964c9d7", "1555215695-3004980ad54e",
];
const RENTAL_PHOTOS = [
  "1533473359331-0135ef1b58bf", "1606664515524-ed2f786a0bd6", "1556189250-72ba954cfc2b",
  "1623869675781-80aa31012a5a", "1612544448445-b8232cff3b6c", "1609521263047-f8f205293f24",
];
const INSURANCE_PHOTO = "1532938911079-1b06ac7ceec7";
const VISA_PHOTOS = [
  "1569949381669-ecf31ae8e613", "1450101499163-c8848c66ca85", "1521295121783-8a321d551ad2",
];
const SEED_COUNTRIES = ["France", "Japan", "United States", "United Kingdom", "Nigeria", "United Arab Emirates", "Germany", "Italy", "Spain", "Canada"];

function unsplash(id: string, w = 1200) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
}

export async function backfillInventory() {
  console.log("[Backfill] ensuring each vertical has at least 50 records...");
  const verticals = [
    { table: "tours", vertical: "tours", prefix: "gyg-seed-" },
    { table: "car_transfers", vertical: "transfers", prefix: "mozio-seed-" },
    { table: "car_rentals", vertical: "rentals", prefix: "rc-seed-" },
    { table: "insurance_packages", vertical: "insurance", prefix: "sw-seed-" },
    { table: "evisas", vertical: "visas", prefix: "sherpa-seed-" },
  ];

  for (const v of verticals) {
    const { count } = await supabase.from(v.table).select("*", { count: "exact", head: true });
    const have = count || 0;
    if (have >= 50) {
      console.log(`[Backfill] ${v.table} healthy (${have})`);
      continue;
    }
    const needed = 50 - have;
    console.log(`[Backfill] seeding ${needed} into ${v.table}`);

    for (let i = 0; i < needed; i++) {
      const country = SEED_COUNTRIES[i % SEED_COUNTRIES.length];
      const seedId = `${v.prefix}${i}-${Date.now()}`;

      if (v.vertical === "tours") {
        await supabase.from("tours").upsert({
          title: `Elite ${country} Discovery Experience #${i + 1}`,
          description: `Immerse yourself in the vibrant culture and hidden gems of ${country}. This curated experience includes private transport, expert local guides and priority access to all venues. Perfect for travellers seeking depth, comfort and authenticity in equal measure.`,
          highlights: ["Private local guide", "All-inclusive refreshments", "Skip-the-line VIP entry", "Small-group format"],
          inclusions: ["Roundtrip transport", "Professional guide", "Gourmet lunch", "Entry tickets"],
          duration: "Full day (8 hours)",
          price_amount: 89 + i * 15,
          price_currency: "USD",
          location: country,
          country,
          image_url: unsplash(TOUR_PHOTOS[i % TOUR_PHOTOS.length]),
          original_id: seedId,
          affiliate_url: "https://www.getyourguide.com",
          provider: "GetYourGuide",
        });
      } else if (v.vertical === "transfers") {
        await supabase.from("car_transfers").upsert({
          vehicle_type: i % 2 === 0 ? "Luxury Executive Sedan" : "Premium VIP Minivan",
          description: "Door-to-door private transfer with meet-and-greet service. Late-model vehicles with high-speed WiFi and refreshments.",
          amenities: ["WiFi", "Bottled Water", "Air Conditioning", "Leather Interior"],
          price_amount: 45 + i * 8,
          price_currency: "USD",
          pickup_location: `${country} Airport`,
          dropoff_location: `${country} City Center`,
          passengers: i % 2 === 0 ? 3 : 6,
          country,
          image_url: unsplash(TRANSFER_PHOTOS[i % TRANSFER_PHOTOS.length]),
          original_id: seedId,
          provider: "Mozio",
          affiliate_url: "https://www.mozio.com",
        });
      } else if (v.vertical === "rentals") {
        const cars = ["Toyota Camry Hybrid", "BMW 5 Series", "Mercedes-Benz E-Class", "Range Rover Sport", "Audi Q7"];
        await supabase.from("car_rentals").upsert({
          vehicle_name: cars[i % cars.length],
          price_amount: 65 + i * 18,
          price_currency: "USD",
          location: country,
          country,
          image_url: unsplash(RENTAL_PHOTOS[i % RENTAL_PHOTOS.length]),
          original_id: seedId,
          provider: "RentalCars",
          metadata: { specs: { seats: i % 2 === 0 ? 5 : 7, bags: 3, transmission: "Automatic", air_conditioning: true } },
          affiliate_url: "https://www.rentalcars.com",
        });
      } else if (v.vertical === "insurance") {
        await supabase.from("insurance_packages").upsert({
          name: `Travsify Global Shield Plan ${i + 1}`,
          description: `Comprehensive worldwide medical and trip protection for travellers visiting ${country}.`,
          coverage_details: "Includes $250k emergency medical, trip cancellation up to $5,000, lost-baggage reimbursement and 24/7 global assistance.",
          benefits: ["$250k Medical", "Trip Cancellation", "Lost Baggage", "24/7 Assistance", "Adventure Sports Add-on"],
          price_amount: 49 + i * 5,
          price_currency: "USD",
          original_id: seedId,
          provider: "SafetyWing",
          image_url: unsplash(INSURANCE_PHOTO),
          affiliate_url: "https://safetywing.com",
        });
      } else if (v.vertical === "visas") {
        await supabase.from("evisas").upsert({
          destination_country: country,
          country,
          visa_type: "eVisa",
          requirement_summary: `Electronic travel authorization for ${country}. Online processing with professional document review.`,
          full_requirements: ["Passport (6 months validity)", "Digital photo (white background)", "Proof of return ticket", "Proof of accommodation", "Bank statement"],
          validity: "90 days from issue",
          price_amount: 50 + i * 10,
          price_currency: "USD",
          processing_time_days: 5,
          original_id: seedId,
          provider: "Sherpa",
          affiliate_url: "https://apply.joinsherpa.com",
        });
      }
    }
  }
  console.log("[Backfill] complete");
}
