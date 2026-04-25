import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  origin: z.string().trim().length(3).regex(/^[A-Z]{3}$/i),
  destination: z.string().trim().length(3).regex(/^[A-Z]{3}$/i),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(9).default(1),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
});

export const Route = createFileRoute("/api/v1/flights/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/flights/search", vertical: "flights" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const input = {
            origin: parsed.data.origin.toUpperCase(),
            destination: parsed.data.destination.toUpperCase(),
            departure_date: parsed.data.departure_date,
            return_date: parsed.data.return_date,
            adults: parsed.data.adults,
            cabin: parsed.data.cabin,
          };

          // ---- Async queue model ---------------------------------------------------
          // We never call the slow supplier inline. Instead:
          //   1. Insert a job row (status=queued) and return its id IMMEDIATELY.
          //   2. Fire-and-forget an internal HTTP call to the processor route, which
          //      runs the actual Duffel/NDC search in its own request budget and
          //      writes the result back to the job row.
          //   3. The partner polls GET /api/v1/flights/search/{search_id} until
          //      status is `succeeded` or `failed`.
          //
          // This means the partner's POST always returns in <1s, eliminating
          // Cloudflare 522 errors regardless of supplier latency.
          const { data: job, error: insertErr } = await supabaseAdmin
            .from("flight_search_jobs")
            .insert({
              user_id: key.userId,
              api_key_id: key.apiKeyId,
              environment: key.environment,
              status: "queued",
              input,
            })
            .select("id")
            .single();
          if (insertErr || !job) {
            return errorResponse("server_error", insertErr?.message || "Failed to enqueue search.", 500);
          }

          // Fire-and-forget: trigger the processor without waiting.
          // The processor route lives under /api/public/* so it skips auth — we
          // protect it with a shared secret derived from the service role key.
          try {
            const url = new URL(request.url);
            const processorUrl = `${url.protocol}//${url.host}/api/public/internal/process-flight-search`;
            // Best-effort kick. We deliberately do not await the response.
            void fetch(processorUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Token": process.env.SUPABASE_SERVICE_ROLE_KEY || "",
              },
              body: JSON.stringify({ job_id: job.id }),
            }).catch((e) => console.error("[flights.search] processor kick failed", e));
          } catch (e) {
            console.error("[flights.search] failed to schedule processor", e);
          }

          return jsonResponse({
            data: {
              search_id: job.id,
              status: "queued",
              poll_url: `/api/v1/flights/search/${job.id}`,
              poll_interval_ms: 2000,
              expires_in_seconds: 1800,
            },
          }, 202);
        }),
    },
  },
});
