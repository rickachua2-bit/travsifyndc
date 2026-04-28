import { createFileRoute } from "@tanstack/react-router";
import { seedGlobalData, TOP_50_COUNTRIES } from "@/server/seed-data";
import { API_CORS_HEADERS } from "@/server/gateway";

export const Route = createFileRoute("/api/v1/admin/sync/seed")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async () => {
        try {
          // Non-blocking: kick off seeder in the background and respond immediately
          seedGlobalData().catch((err) =>
            console.error("[Seed API] Background seeding error:", err)
          );

          return new Response(
            JSON.stringify({
              success: true,
              message: `Global warm-up started for ${TOP_50_COUNTRIES.length} countries across all verticals. This will run in the background.`,
              countries: TOP_50_COUNTRIES,
            }),
            {
              status: 202, // 202 Accepted — work is in progress
              headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : "Error",
            }),
            {
              status: 500,
              headers: { ...API_CORS_HEADERS, "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
