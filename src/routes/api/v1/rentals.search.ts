// Public car-rentals search API. Reads pre-warmed inventory from the DB
// (populated by the global warm-up + on-demand background scrape) and applies
// Travsify + partner markup before returning to the API consumer.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchRentals } from "@/server/providers/car-rentals";
import { composePrice } from "@/server/bookings";

const Schema = z.object({
  location: z.string().min(2).max(120),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dropoff_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).optional(),
});

export const Route = createFileRoute("/api/v1/rentals/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(
          request,
          { endpoint: "/v1/rentals/search", vertical: "car_rentals", provider: "rentalcars" },
          async (key) => {
            let body: unknown;
            try {
              body = await request.json();
            } catch {
              return errorResponse("invalid_json", "Body must be valid JSON.", 400);
            }
            const parsed = Schema.safeParse(body);
            if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

            let rentals: Awaited<ReturnType<typeof searchRentals>>["rentals"] = [];
            try {
              const result = await searchRentals(parsed.data);
              rentals = result.rentals;
            } catch (e) {
              console.warn("Rentals search unavailable:", (e as Error).message);
              return jsonResponse({
                data: { rentals: [] },
                warning: { code: "search_unavailable", message: "Car rentals search is temporarily unavailable. Please retry shortly.", fallback: true },
              });
            }

            const priced = await Promise.all(
              rentals.map(async (r) => {
                const price = await composePrice({
                  partnerId: key.userId,
                  vertical: "car_rentals",
                  providerBase: r.price_amount,
                  currency: r.price_currency,
                });
                // Strip the affiliate_url — partners must not redirect customers.
                const { affiliate_url: _omit, ...publicFields } = r;
                return {
                  ...publicFields,
                  base_price: r.price_amount,
                  price: price.total,
                  price_breakdown: price,
                };
              }),
            );

            return jsonResponse({
              data: { rentals: priced },
              ...(priced.length === 0
                ? { warning: { code: "no_inventory", message: "No car-rental inventory cached for this location yet — a background warm-up has been triggered.", fallback: true } }
                : {}),
            });
          },
        ),
    },
  },
});
