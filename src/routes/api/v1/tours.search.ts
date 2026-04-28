import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchTours } from "@/server/providers/getyourguide";
import { composePrice } from "@/server/bookings";

const Schema = z.object({
  query: z.string().min(2).max(100),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency: z.string().length(3).optional(),
});

export const Route = createFileRoute("/api/v1/tours/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/tours/search", vertical: "tours", provider: "getyourguide" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          let tours: Awaited<ReturnType<typeof searchTours>>["tours"] = [];
          try {
            const result = await searchTours(parsed.data);
            tours = result.tours;
          } catch (e) {
            console.warn("Tours search unavailable:", (e as Error).message);
            return jsonResponse({
              data: { tours: [] },
              warning: { code: "search_unavailable", message: "Tours search is temporarily unavailable. Please retry shortly.", fallback: true },
            });
          }
          const priced = await Promise.all(tours.map(async (t) => {
            const price = await composePrice({
              partnerId: key.userId,
              vertical: "tours",
              providerBase: t.price,
              currency: t.currency,
            });
            // Strip booking_url — partners shouldn't redirect customers; we fulfill.
            const { booking_url: _omit, ...publicFields } = t;
            return { ...publicFields, base_price: t.price, price: price.total, price_breakdown: price };
          }));

          return jsonResponse({
            data: { tours: priced },
            ...(priced.length === 0
              ? { warning: { code: "no_inventory", message: "No tour inventory matches this query yet.", fallback: true } }
              : {}),
          });
        }),
    },
  },
});
