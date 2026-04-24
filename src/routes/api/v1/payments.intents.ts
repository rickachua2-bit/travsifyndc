import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createPaymentIntent } from "@/server/providers/stripe";

const Schema = z.object({
  amount: z.number().int().positive().max(100_000_000),
  currency: z.string().length(3),
  description: z.string().max(255).optional(),
  customer_email: z.string().email().max(255).optional(),
  booking_reference: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/v1/payments/intents")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/payments/intents", vertical: "payments", provider: "stripe" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const intent = await createPaymentIntent({
            amount: parsed.data.amount,
            currency: parsed.data.currency,
            description: parsed.data.description,
            customer_email: parsed.data.customer_email,
            metadata: {
              user_id: key.userId,
              environment: key.environment,
              ...(parsed.data.booking_reference ? { booking_reference: parsed.data.booking_reference } : {}),
            },
          });

          return jsonResponse({
            data: {
              payment_intent_id: intent.id,
              client_secret: intent.client_secret,
              status: intent.status,
            },
          }, 201);
        }),
    },
  },
});
