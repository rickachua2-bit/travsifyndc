import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchTransfers } from "@/server/providers/mozio";
import { composePrice } from "@/server/bookings";

const Schema = z.object({
  pickup_address: z.string().min(3).max(300),
  dropoff_address: z.string().min(3).max(300),
  pickup_datetime: z.string().min(10).max(40),
  num_passengers: z.number().int().min(1).max(20),
  currency: z.string().length(3).optional(),
});

export const Route = createFileRoute("/api/v1/transfers/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/transfers/search", vertical: "transfers", provider: "mozio" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const { quotes } = await searchTransfers(parsed.data);

          // Apply markup so what the partner sees is the final customer price.
          const priced = await Promise.all(quotes.map(async (q) => {
            const price = await composePrice({
              partnerId: key.userId,
              vertical: "transfers",
              providerBase: q.total_price,
              currency: q.currency,
            });
            return { ...q, base_price: q.total_price, total_price: price.total, price_breakdown: price };
          }));

          return jsonResponse({ data: { transfers: priced } });
        }),
    },
  },
});
