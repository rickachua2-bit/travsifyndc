import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchInsurance } from "@/server/providers/safetywing";
import { composePrice } from "@/server/bookings";

const Schema = z.object({
  nationality: z.string().length(2),
  destination: z.string().length(2),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  travelers: z.array(z.object({ age: z.number().int().min(0).max(120) })).min(1).max(10),
  coverage_type: z.enum(["nomad", "trip", "remote_health"]).optional(),
});

export const Route = createFileRoute("/api/v1/insurance/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/insurance/search", vertical: "insurance", provider: "safetywing" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const { quotes } = await searchInsurance({
            nationality: parsed.data.nationality.toUpperCase(),
            destination: parsed.data.destination.toUpperCase(),
            start_date: parsed.data.start_date,
            end_date: parsed.data.end_date,
            travelers: parsed.data.travelers,
            coverage_type: parsed.data.coverage_type,
          });

          const priced = await Promise.all(quotes.map(async (q) => {
            const price = await composePrice({
              partnerId: key.userId,
              vertical: "insurance",
              providerBase: q.price,
              currency: q.currency,
            });
            return { ...q, base_price: q.price, price: price.total, price_breakdown: price };
          }));

          return jsonResponse({ data: { policies: priced } });
        }),
    },
  },
});
