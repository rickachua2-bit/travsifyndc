import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createBookingAndDebit, InsufficientFundsError } from "@/server/bookings";

const Schema = z.object({
  quote_id: z.string().min(1).max(300),
  base_price: z.number().positive().max(1_000_000),
  currency: z.string().length(3),
  passenger: z.object({
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    email: z.string().email().max(255),
    phone: z.string().min(5).max(30),
  }),
  flight_number: z.string().max(20).optional(),
  special_instructions: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/v1/transfers/bookings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/transfers/bookings", vertical: "transfers", provider: "mozio" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          try {
            // Manual fulfillment: wallet is debited now, ops books on Mozio portal afterwards.
            const created = await createBookingAndDebit({
              key,
              vertical: "transfers",
              provider: "mozio",
              fulfillmentMode: "manual",
              providerBase: parsed.data.base_price,
              currency: parsed.data.currency,
              customer: {
                name: `${parsed.data.passenger.first_name} ${parsed.data.passenger.last_name}`,
                email: parsed.data.passenger.email,
              },
              metadata: {
                quote_id: parsed.data.quote_id,
                passenger: parsed.data.passenger,
                flight_number: parsed.data.flight_number,
                special_instructions: parsed.data.special_instructions,
              },
            });
            return jsonResponse({
              data: {
                reference: created.reference,
                status: "processing",
                fulfillment: "manual",
                price: created.price,
                message: "Booking captured. We'll confirm within 1 hour.",
              },
            }, 201);
          } catch (e) {
            if (e instanceof InsufficientFundsError) {
              return errorResponse("insufficient_funds", e.message, 402);
            }
            throw e;
          }
        }),
    },
  },
});
