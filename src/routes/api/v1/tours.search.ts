import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchTours } from "@/server/providers/getyourguide";
import { composePrice } from "@/server/bookings";
import { aliasFields, formatZodIssues } from "@/server/api-helpers";

const Schema = z.object({
  query: z.string().min(2, "must be at least 2 characters (city or activity, e.g. 'Dubai desert safari')").max(100),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD").optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD").optional(),
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
          // Accept common aliases: destination/city/keyword/q -> query; date -> date_from.
          const aliased = aliasFields(body, {
            destination: "query",
            destination_name: "query",
            city: "query",
            keyword: "query",
            q: "query",
            search: "query",
            date: "date_from",
          });
          const parsed = Schema.safeParse(aliased);
          if (!parsed.success) {
            const { message, details } = formatZodIssues(parsed.error);
            return jsonResponse({ error: { code: "validation_error", message, details } }, 400);
          }

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
