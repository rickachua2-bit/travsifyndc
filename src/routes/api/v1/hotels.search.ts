import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchHotelRates } from "@/server/providers/liteapi";
import { composePrice } from "@/server/bookings";

const Schema = z.object({
  city_code: z.string().min(2).max(8).optional(),
  country_code: z.string().length(2).optional(),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).optional(),
  currency: z.string().length(3).optional(),
}).refine((v) => v.city_code || v.country_code, { message: "city_code or country_code required" });

export const Route = createFileRoute("/api/v1/hotels/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/hotels/search", vertical: "hotels", provider: "liteapi" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const result = await searchHotelRates(parsed.data);

          // Two-tier markup applied per hotel
          const priced = await Promise.all(result.hotels.map(async (h) => {
            if (!h.price) return h;
            const price = await composePrice({
              partnerId: key.userId,
              vertical: "hotels",
              providerBase: Number(h.price),
              currency: h.currency,
            });
            return { ...h, base_price: h.price, price: price.total, price_breakdown: price };
          }));

          return jsonResponse({ data: { hotels: priced } });
        }),
    },
  },
});
