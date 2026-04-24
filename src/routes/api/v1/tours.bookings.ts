import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createBookingAndDebit, InsufficientFundsError } from "@/server/bookings";

const Schema = z.object({
  tour_id: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  base_price: z.number().positive().max(1_000_000),
  currency: z.string().length(3),
  participants: z.array(z.object({
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    age: z.number().int().min(0).max(120).optional(),
  })).min(1).max(20),
  contact: z.object({
    email: z.string().email().max(255),
    phone: z.string().min(5).max(30),
  }),
});

export const Route = createFileRoute("/api/v1/tours/bookings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/tours/bookings", vertical: "tours", provider: "getyourguide" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          try {
            const created = await createBookingAndDebit({
              key,
              vertical: "tours",
              provider: "getyourguide",
              fulfillmentMode: "manual",
              providerBase: parsed.data.base_price,
              currency: parsed.data.currency,
              customer: {
                name: `${parsed.data.participants[0].first_name} ${parsed.data.participants[0].last_name}`,
                email: parsed.data.contact.email,
              },
              metadata: {
                tour_id: parsed.data.tour_id,
                date: parsed.data.date,
                participants: parsed.data.participants,
                contact: parsed.data.contact,
              },
            });
            return jsonResponse({
              data: {
                reference: created.reference,
                status: "processing",
                fulfillment: "manual",
                price: created.price,
                message: "Tour booking captured. We'll confirm shortly.",
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
