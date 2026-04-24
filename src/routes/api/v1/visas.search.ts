import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { searchVisas } from "@/server/providers/sherpa";
import { composePrice } from "@/server/bookings";

const Schema = z.object({
  nationality: z.string().length(2),
  destination: z.string().length(2),
  purpose: z.enum(["tourism", "business", "transit"]).optional(),
});

export const Route = createFileRoute("/api/v1/visas/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/visas/search", vertical: "visas", provider: "sherpa" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const { options } = await searchVisas({
            nationality: parsed.data.nationality.toUpperCase(),
            destination: parsed.data.destination.toUpperCase(),
            purpose: parsed.data.purpose,
          });

          const priced = await Promise.all(options.map(async (v) => {
            const price = await composePrice({
              partnerId: key.userId,
              vertical: "visas",
              providerBase: v.price,
              currency: v.currency,
            });
            return { ...v, base_price: v.price, price: price.total, price_breakdown: price };
          }));

          return jsonResponse({ data: { visas: priced } });
        }),
    },
  },
});
