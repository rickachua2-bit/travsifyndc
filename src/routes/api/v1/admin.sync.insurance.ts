import { createFileRoute } from "@tanstack/react-router";
import { syncInsurance } from "@/server/sync-engines";
import { API_CORS_HEADERS } from "@/server/gateway";

export const Route = createFileRoute("/api/v1/admin/sync/insurance")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async () => {
        try {
          const results = await syncInsurance();
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
