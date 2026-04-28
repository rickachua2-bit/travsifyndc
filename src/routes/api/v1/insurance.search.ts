import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchInsurance } from "@/server/providers/safetywing";
import { composePrice } from "@/server/bookings";
import { aliasFields, formatZodIssues, normalizeCountry, normalizeTravelers } from "@/server/api-helpers";

const Schema = z.object({
  nationality: z.string().length(2, "must be a 2-letter ISO country code (e.g. 'NG')"),
  destination: z.string().length(2, "must be a 2-letter ISO country code (e.g. 'GB')"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
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
          const aliased = aliasFields(body, {
            from_country: "nationality",
            to_country: "destination",
            country_from: "nationality",
            country_to: "destination",
            from: "start_date",
            to: "end_date",
            depart_date: "start_date",
            return_date: "end_date",
          });
          aliased.nationality = normalizeCountry(aliased.nationality);
          aliased.destination = normalizeCountry(aliased.destination);
          aliased.travelers = normalizeTravelers(aliased.travelers);
          const parsed = Schema.safeParse(aliased);
          if (!parsed.success) {
            const { message, details } = formatZodIssues(parsed.error);
            return jsonResponse({ error: { code: "validation_error", message, details } }, 400);
          }

          let quotes: Awaited<ReturnType<typeof searchInsurance>>["quotes"] = [];
          try {
            const result = await searchInsurance({
              nationality: parsed.data.nationality.toUpperCase(),
              destination: parsed.data.destination.toUpperCase(),
              start_date: parsed.data.start_date,
              end_date: parsed.data.end_date,
              travelers: parsed.data.travelers,
              coverage_type: parsed.data.coverage_type,
            });
            quotes = result.quotes;
          } catch (e) {
            console.warn("Insurance search unavailable:", (e as Error).message);
            return jsonResponse({
              data: { policies: [] },
              warning: { code: "search_unavailable", message: "Insurance search is temporarily unavailable. Please retry shortly.", fallback: true },
            });
          }

          const priced = await Promise.all(quotes.map(async (q) => {
            const price = await composePrice({
              partnerId: key.userId,
              vertical: "insurance",
              providerBase: q.price,
              currency: q.currency,
            });
            return { ...q, base_price: q.price, price: price.total, price_breakdown: price };
          }));

          return jsonResponse({
            data: { policies: priced },
            ...(priced.length === 0
              ? { warning: { code: "no_inventory", message: "No insurance inventory matches this request yet.", fallback: true } }
              : {}),
          });
        }),
    },
  },
});
