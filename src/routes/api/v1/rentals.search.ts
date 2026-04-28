// Public car-rentals search API. Reads pre-warmed inventory from the DB
// (populated by the global warm-up + on-demand background scrape) and applies
// Travsify + partner markup before returning to the API consumer.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchRentals } from "@/server/providers/car-rentals";
import { composePrice } from "@/server/bookings";
import { aliasFields, formatZodIssues } from "@/server/api-helpers";

const Schema = z.object({
  location: z.string().min(2, "must be at least 2 characters (city or airport, e.g. 'Dubai')").max(120),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  dropoff_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
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
            const aliased = aliasFields(body, {
              city: "location",
              destination: "location",
              pickup_location: "location",
              pickup: "pickup_date",
              dropoff: "dropoff_date",
              return_date: "dropoff_date",
              start_date: "pickup_date",
              end_date: "dropoff_date",
            });
            const parsed = Schema.safeParse(aliased);
            if (!parsed.success) {
              const { message, details } = formatZodIssues(parsed.error);
              return jsonResponse({ error: { code: "validation_error", message, details } }, 400);
            }

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
