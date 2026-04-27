// Internal processor for queued flight searches.
//
// WHY: The partner-facing POST /api/v1/flights/search must return in <1s to
// avoid Cloudflare 522s, so it just enqueues a job. This route does the slow
// work: calls Duffel + NDC, applies markups, and writes the result back to the
// `flight_search_jobs` row. The partner polls /api/v1/flights/search/{id}.
//
// SECURITY: lives under /api/public/* so no Supabase auth is enforced. Instead
// we require a shared `X-Internal-Token` equal to the service role key. Only
// our own enqueue handler knows this value (it runs server-side with access to
// process.env.SUPABASE_SERVICE_ROLE_KEY).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { processFlightSearchJob } from "@/server/flight-search-processor";

const Body = z.object({ job_id: z.string().uuid() });

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/internal/process-flight-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ----- Auth (shared internal token) -----
        const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const got = request.headers.get("x-internal-token");
        if (!expected || !got || got !== expected) {
          return ok({ error: "unauthorized" }, 401);
        }

        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return ok({ error: "invalid_body" }, 400);
        }

        try {
          return ok(await processFlightSearchJob(parsed.job_id));
        } catch (e) {
          console.error("[process-flight-search] failed", e);
          return ok({ error: "processor_failed", detail: (e as Error).message }, 500);
        }
      },
    },
  },
});