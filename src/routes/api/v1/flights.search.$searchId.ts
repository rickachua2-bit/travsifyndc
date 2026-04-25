// Poll endpoint for async flight search jobs.
// Partners call this after POST /v1/flights/search returned a `search_id`.
//
// Status values:
//   - queued     → not picked up yet; keep polling
//   - running    → processor is calling the supplier; keep polling
//   - succeeded  → `results` contains { flights, suppliers_called }
//   - failed     → `error` contains { code, message }; do NOT retry the same id
//
// HTTP status:
//   - 200 for queued/running/succeeded
//   - 200 for failed (the call itself succeeded; the failure is in payload)
//   - 404 if the search_id does not belong to the caller or has expired
import { createFileRoute } from "@tanstack/react-router";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/v1/flights/search/$searchId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      GET: async ({ request, params }) =>
        withGateway(request, { endpoint: "/v1/flights/search/:id", vertical: "flights" }, async (key) => {
          const { data, error } = await supabaseAdmin
            .from("flight_search_jobs")
            .select("id, status, result, error_code, error_message, suppliers_called, created_at, completed_at, expires_at, user_id")
            .eq("id", params.searchId)
            .maybeSingle();

          if (error) return errorResponse("server_error", error.message, 500);
          if (!data || data.user_id !== key.userId) {
            return errorResponse("not_found", "Search id not found or expired.", 404);
          }

          if (data.status === "succeeded") {
            return jsonResponse({
              data: {
                search_id: data.id,
                status: "succeeded",
                ...(data.result as Record<string, unknown> ?? {}),
                completed_at: data.completed_at,
              },
            });
          }
          if (data.status === "failed") {
            return jsonResponse({
              data: {
                search_id: data.id,
                status: "failed",
                error: { code: data.error_code, message: data.error_message },
                suppliers_called: data.suppliers_called,
                completed_at: data.completed_at,
              },
            });
          }
          // queued or running
          return jsonResponse({
            data: {
              search_id: data.id,
              status: data.status,
              poll_interval_ms: 2000,
            },
          });
        }),
    },
  },
});