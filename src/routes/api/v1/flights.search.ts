import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchFlights } from "@/server/providers/duffel";
import { ndcSearch, isNdcEnabled } from "@/server/providers/ndc";

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

          const [duffelRes, ndcRes] = await Promise.allSettled([
            searchFlights(key.environment, input),
            isNdcEnabled() ? ndcSearch(input) : Promise.resolve({ offers: [] as Array<Record<string, unknown>> }),
          ]);

          const duffelOffers = duffelRes.status === "fulfilled" ? duffelRes.value.offers : [];
          const ndcOffers = ndcRes.status === "fulfilled" ? (ndcRes.value as { offers: Array<Record<string, unknown>> }).offers : [];

          if (duffelRes.status === "rejected" && ndcOffers.length === 0) {
            return errorResponse("supplier_error", (duffelRes.reason as Error).message, 502);
          }

          return jsonResponse({
            data: {
              flights: [
                ...duffelOffers.map((o) => ({ ...o, source: "duffel" })),
                ...ndcOffers.map((o) => ({ ...o, source: "ndc" })),
              ],
              suppliers_called: ["duffel", ...(isNdcEnabled() ? ["ndc"] : [])],
            },
          });
        }),
    },
  },
});
