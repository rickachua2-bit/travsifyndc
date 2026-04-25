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
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { searchFlights } from "@/server/providers/duffel";
import { ndcSearch, isNdcEnabled } from "@/server/providers/ndc";
import { composePrice } from "@/server/bookings";
import { ProviderTimeoutError } from "@/server/providers/fetch-with-timeout";

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

        // ----- Atomically claim the job (queued -> running) -----
        // We only proceed if the row is still `queued`, preventing duplicate runs
        // if the enqueue endpoint accidentally fired the kick twice.
        const { data: claimed, error: claimErr } = await supabaseAdmin
          .from("flight_search_jobs")
          .update({ status: "running", started_at: new Date().toISOString(), attempts: 1 })
          .eq("id", parsed.job_id)
          .eq("status", "queued")
          .select("id, user_id, environment, input")
          .maybeSingle();

        if (claimErr) {
          console.error("[process-flight-search] claim error", claimErr);
          return ok({ error: "claim_failed", detail: claimErr.message }, 500);
        }
        if (!claimed) {
          // Already running, succeeded, or failed — nothing to do.
          return ok({ status: "noop" });
        }

        const input = claimed.input as {
          origin: string;
          destination: string;
          departure_date: string;
          return_date?: string;
          adults: number;
          cabin: "economy" | "premium_economy" | "business" | "first";
        };

        // ----- Call suppliers in parallel -----
        const [duffelRes, ndcRes] = await Promise.allSettled([
          searchFlights(claimed.environment as "sandbox" | "live", input),
          isNdcEnabled() ? ndcSearch(input) : Promise.resolve({ offers: [] as Array<Record<string, unknown>> }),
        ]);

        const duffelOffers = duffelRes.status === "fulfilled" ? duffelRes.value.offers : [];
        const ndcOffers = ndcRes.status === "fulfilled"
          ? (ndcRes.value as { offers: Array<Record<string, unknown>> }).offers
          : [];
        const suppliersCalled = ["duffel", ...(isNdcEnabled() ? ["ndc"] : [])];

        // ----- Hard failure: every supplier rejected, no offers at all -----
        if (duffelRes.status === "rejected" && ndcOffers.length === 0) {
          const reason = duffelRes.reason as Error;
          const isTimeout = reason instanceof ProviderTimeoutError;
          await supabaseAdmin
            .from("flight_search_jobs")
            .update({
              status: "failed",
              error_code: isTimeout ? "upstream_timeout" : "supplier_error",
              error_message: reason?.message || "Supplier call failed",
              suppliers_called: suppliersCalled,
              completed_at: new Date().toISOString(),
            })
            .eq("id", claimed.id);
          return ok({ status: "failed", reason: reason?.message });
        }

        // ----- Apply two-tier markup -----
        const allOffers = [
          ...duffelOffers.map((o) => ({ ...o, source: "duffel" })),
          ...ndcOffers.map((o) => ({ ...o, source: "ndc" })),
        ];
        const priced = await Promise.all(allOffers.map(async (o) => {
          const baseAmount = Number((o as Record<string, unknown>).total_amount);
          const currency = String((o as Record<string, unknown>).total_currency || "USD");
          if (!Number.isFinite(baseAmount) || baseAmount <= 0) return o;
          try {
            const price = await composePrice({
              partnerId: claimed.user_id,
              vertical: "flights",
              providerBase: baseAmount,
              currency,
            });
            return {
              ...o,
              base_amount: baseAmount.toFixed(2),
              total_amount: price.total.toFixed(2),
              price_breakdown: price,
            };
          } catch (e) {
            console.error("[process-flight-search] composePrice failed", e);
            return o;
          }
        }));

        await supabaseAdmin
          .from("flight_search_jobs")
          .update({
            status: "succeeded",
            result: { flights: priced, suppliers_called: suppliersCalled },
            suppliers_called: suppliersCalled,
            completed_at: new Date().toISOString(),
          })
          .eq("id", claimed.id);

        return ok({ status: "succeeded", offers: priced.length });
      },
    },
  },
});