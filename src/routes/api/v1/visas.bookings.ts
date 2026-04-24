import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createBookingAndDebit, InsufficientFundsError } from "@/server/bookings";

const Schema = z.object({
  visa_option_id: z.string().min(1).max(64),
  base_price: z.number().positive().max(1_000_000),
  currency: z.string().length(3),
  applicant: z.object({
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    passport_number: z.string().min(4).max(20),
    passport_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nationality: z.string().length(2),
    email: z.string().email().max(255),
  }),
  travel_dates: z.object({
    arrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    departure: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

export const Route = createFileRoute("/api/v1/visas/bookings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/visas/bookings", vertical: "visas", provider: "sherpa" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          try {
            const created = await createBookingAndDebit({
              key,
              vertical: "visas",
              provider: "sherpa",
              fulfillmentMode: "manual",
              providerBase: parsed.data.base_price,
              currency: parsed.data.currency,
              customer: {
                name: `${parsed.data.applicant.first_name} ${parsed.data.applicant.last_name}`,
                email: parsed.data.applicant.email,
              },
              metadata: {
                visa_option_id: parsed.data.visa_option_id,
                applicant: parsed.data.applicant,
                travel_dates: parsed.data.travel_dates,
              },
            });
            return jsonResponse({
              data: {
                reference: created.reference,
                status: "processing",
                fulfillment: "manual",
                price: created.price,
                message: "Visa application captured. We'll begin processing shortly.",
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
