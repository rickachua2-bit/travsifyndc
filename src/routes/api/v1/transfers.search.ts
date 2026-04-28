import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchTransfers } from "@/server/providers/mozio";
import { composePrice } from "@/server/bookings";
import { aliasFields, formatZodIssues } from "@/server/api-helpers";

const Schema = z.object({
  pickup_address: z.string().min(3, "must be at least 3 characters").max(300),
  dropoff_address: z.string().min(3, "must be at least 3 characters").max(300),
  pickup_datetime: z.string().min(10, "must be an ISO-8601 timestamp, e.g. '2026-06-12T18:30:00'").max(40),
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
          // Accept aliases for partners using shorter / alternative field names.
          const aliased = aliasFields(body, {
            pickup: "pickup_address",
            pickup_location: "pickup_address",
            from: "pickup_address",
            origin: "pickup_address",
            dropoff: "dropoff_address",
            dropoff_location: "dropoff_address",
            to: "dropoff_address",
            destination: "dropoff_address",
            datetime: "pickup_datetime",
            pickup_time: "pickup_datetime",
            when: "pickup_datetime",
            passengers: "num_passengers",
            pax: "num_passengers",
            travelers: "num_passengers",
          });
          // Coerce common stringified numbers.
          if (typeof aliased.num_passengers === "string") {
            const n = Number(aliased.num_passengers);
            if (Number.isFinite(n)) aliased.num_passengers = n;
          }
          const parsed = Schema.safeParse(aliased);
          if (!parsed.success) {
            const { message, details } = formatZodIssues(parsed.error);
            return jsonResponse({ error: { code: "validation_error", message, details } }, 400);
          }

          let quotes: Awaited<ReturnType<typeof searchTransfers>>["quotes"] = [];
          try {
            const result = await searchTransfers(parsed.data);
            quotes = result.quotes;
          } catch (e) {
            console.warn("Transfers search unavailable:", (e as Error).message);
            return jsonResponse({
              data: { transfers: [] },
              warning: { code: "search_unavailable", message: "Transfers search is temporarily unavailable. Please retry shortly.", fallback: true },
            });
          }

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

          return jsonResponse({
            data: { transfers: priced },
            ...(priced.length === 0
              ? { warning: { code: "no_inventory", message: "No transfer inventory matches this route yet.", fallback: true } }
              : {}),
          });
        }),
    },
  },
});
