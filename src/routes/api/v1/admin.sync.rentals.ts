import { createFileRoute } from "@tanstack/react-router";
import { syncRentals } from "@/server/sync-engines";
import { API_CORS_HEADERS } from "@/server/gateway";

export const Route = createFileRoute("/api/v1/admin/sync/rentals")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const countries = body.countries || ["United Kingdom", "United States", "Nigeria", "UAE"];
          const results = await syncRentals(countries);
          return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" }
          });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Error" }), {
            status: 500,
            headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      },
    }
  }
});
