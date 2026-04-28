import { createClient } from "@supabase/supabase-js";
import { ensureDataExists } from "@/server/sync-engines";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export type RentalSearchInput = {
  location: string;
  pickup_date: string;
  dropoff_date: string;
  currency?: string;
};

export type RentalOffer = {
  id: string;
  vehicle_name: string;
  provider: string;
  price_amount: number;
  price_currency: string;
  image_url: string;
  affiliate_url: string;
};

export async function searchRentals(input: RentalSearchInput): Promise<{ rentals: RentalOffer[] }> {
  console.log(`Searching internal database for rentals in: ${input.location}...`);
  
  // auto-fetch if no rental data for this country
  ensureDataExists("rentals", input.location);

  try {
    const { data, error } = await supabase
      .from("car_rentals")
      .select("*")
      .or(`location.ilike.%${input.location}%,country.ilike.%${input.location}%`)
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log("No matching rentals found in internal database.");
      return { rentals: [] };
    }

    return {
      rentals: data.map((r) => ({
        id: r.original_id,
        vehicle_name: r.vehicle_name,
        provider: r.provider,
        price_amount: Number(r.price_amount),
        price_currency: r.price_currency,
        image_url: r.image_url || "",
        affiliate_url: r.affiliate_url || "",
      })),
    };
  } catch (err) {
    console.error("Internal rental search failed:", err);
    return { rentals: [] };
  }
}
