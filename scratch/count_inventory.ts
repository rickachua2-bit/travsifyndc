import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dprdpztanrxnwvgsowoz.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // I'll hope it's in the environment

const supabase = createClient(supabaseUrl, supabaseKey);

async function count() {
  const tables = ["tours", "car_transfers", "car_rentals", "insurance_packages", "evisas"];
  console.log("Current Inventory Counts:");
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.error(`Error counting ${table}:`, error.message);
    } else {
      console.log(`${table}: ${count} rows`);
    }
  }
}

count();
