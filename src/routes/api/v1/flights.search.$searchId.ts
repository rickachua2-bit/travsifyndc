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

/**
 * Self-healing kick: if the original enqueue's fire-and-forget subrequest was
 * killed by the Worker runtime, the job will sit in `queued` (or in `running`
 * with a stale `started_at`) forever. On every poll we detect that and re-fire
 * the processor. This guarantees jobs eventually complete even if the platform
 * drops the initial kick.
 */
function shouldRekick(status: string, started_at: string | null, created_at: string): boolean {
  if (status === "queued") {
    // Give the original kick ~3s grace before re-triggering.
    return Date.now() - new Date(created_at).getTime() > 3_000;
  }
  if (status === "running" && started_at) {
    // If a job has been "running" for >30s it is almost certainly orphaned
    // (the processor Worker died mid-call). Re-claim it.
    return Date.now() - new Date(started_at).getTime() > 30_000;
  }
  return false;
}

async function rekickProcessor(request: Request, jobId: string) {
  try {
    const url = new URL(request.url);
    const processorUrl = `${url.protocol}//${url.host}/api/public/internal/process-flight-search`;
    // If the job is stuck in `running` we need the processor to be allowed to
    // re-claim it; reset to `queued` first.
    await supabaseAdmin
      .from("flight_search_jobs")
      .update({ status: "queued", started_at: null })
      .eq("id", jobId)
      .in("status", ["queued", "running"])
      .lt("attempts", 3);
    const kick = fetch(processorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      },
      body: JSON.stringify({ job_id: jobId }),
    }).catch((e) => console.error("[flights.search.poll] rekick failed", e));
    await Promise.race([kick, new Promise((r) => setTimeout(r, 600))]);
  } catch (e) {
    console.error("[flights.search.poll] rekick error", e);
  }
}

export const Route = createFileRoute("/api/v1/flights/search/$searchId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      GET: async ({ request, params }) =>
        withGateway(request, { endpoint: "/v1/flights/search/:id", vertical: "flights" }, async (key) => {
          const { data, error } = await supabaseAdmin
            .from("flight_search_jobs")
            .select("id, status, result, error_code, error_message, suppliers_called, created_at, started_at, completed_at, expires_at, user_id")
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
          // queued or running — self-heal if stuck
          if (shouldRekick(data.status, data.started_at, data.created_at)) {
            await rekickProcessor(request, data.id);
          }
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