import { createFileRoute } from "@tanstack/react-router";
import { syncTours } from "@/server/sync-engines";
import { API_CORS_HEADERS } from "@/server/gateway";

export const Route = createFileRoute("/api/v1/admin/sync/tours")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const cities = body.cities || [
            "Lagos, Nigeria",
            "London, UK",
            "Paris, France",
            "Dubai, UAE",
            "New York, USA",
            "Nairobi, Kenya",
            "Cape Town, South Africa",
            "Accra, Ghana"
          ];

          console.log(`Starting sync for ${cities.length} cities...`);
          const results = await syncTours(cities);

          return new Response(JSON.stringify({
            success: true,
            message: "Tour synchronization completed successfully",
            results
          }), {
            status: 200,
            headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("Sync API error:", error);
          return new Response(JSON.stringify({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error"
          }), {
            status: 500,
            headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      },
    }
  }
});
