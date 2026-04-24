import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createBookingAndDebit, InsufficientFundsError } from "@/server/bookings";

const Schema = z.object({
  quote_id: z.string().min(1).max(120),
  base_price: z.number().positive().max(1_000_000),
  currency: z.string().length(3),
  policyholder: z.object({
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    email: z.string().email().max(255),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nationality: z.string().length(2),
  }),
  travelers: z.array(z.object({
    first_name: z.string().min(1).max(80),
    last_name: z.string().min(1).max(80),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).min(1).max(10),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const Route = createFileRoute("/api/v1/insurance/bookings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/insurance/bookings", vertical: "insurance", provider: "safetywing" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          try {
            const created = await createBookingAndDebit({
              key,
              vertical: "insurance",
              provider: "safetywing",
              fulfillmentMode: "manual",
              providerBase: parsed.data.base_price,
              currency: parsed.data.currency,
              customer: {
                name: `${parsed.data.policyholder.first_name} ${parsed.data.policyholder.last_name}`,
                email: parsed.data.policyholder.email,
              },
              metadata: {
                quote_id: parsed.data.quote_id,
                policyholder: parsed.data.policyholder,
                travelers: parsed.data.travelers,
                start_date: parsed.data.start_date,
                end_date: parsed.data.end_date,
              },
            });
            return jsonResponse({
              data: {
                reference: created.reference,
                status: "processing",
                fulfillment: "manual",
                price: created.price,
                message: "Insurance application captured. Policy will be bound shortly.",
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
