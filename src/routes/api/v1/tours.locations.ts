import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { API_CORS_HEADERS } from "@/server/gateway";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export const Route = createFileRoute("/api/v1/tours/locations")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      GET: async () => {
        try {
          const { data, error } = await supabase
            .from("tours")
            .select("country")
            .not("country", "is", null)
            .order("country");

          if (error) throw error;

          const countries = data.map(item => item.country);
          const uniqueCountries = Array.from(new Set(countries));

          return new Response(JSON.stringify({
            success: true,
            locations: uniqueCountries
          }), {
            status: 200,
            headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("Fetch locations error:", error);
          return new Response(JSON.stringify({
            success: false,
            message: "Failed to fetch available locations"
          }), {
            status: 500,
            headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      },
    }
  }
});
