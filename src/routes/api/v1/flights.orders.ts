import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS, genBookingRef } from "@/server/gateway";
import { createOrder } from "@/server/providers/duffel";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  offer_id: z.string().min(1).max(200),
  passengers: z.array(z.object({
    given_name: z.string().min(1).max(80),
    family_name: z.string().min(1).max(80),
    born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.enum(["m", "f"]),
    title: z.enum(["mr", "ms", "mrs", "miss", "dr"]),
    email: z.string().email().max(255),
    phone_number: z.string().min(5).max(30),
  })).min(1).max(9),
  payment_amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  payment_currency: z.string().length(3),
});

export const Route = createFileRoute("/api/v1/flights/orders")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/flights/orders", vertical: "flights", provider: "duffel" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          const order = await createOrder(key.environment, parsed.data);
          const ref = genBookingRef();
          const passenger = parsed.data.passengers[0];

          await supabaseAdmin.from("bookings").insert({
            user_id: key.userId,
            api_key_id: key.apiKeyId,
            environment: key.environment,
            vertical: "flights",
            provider: "duffel",
            provider_reference: (order.data as Record<string, unknown>).id as string,
            reference: ref,
            status: "confirmed",
            customer_email: passenger.email,
            customer_name: `${passenger.given_name} ${passenger.family_name}`,
            currency: parsed.data.payment_currency,
            total_amount: Number(parsed.data.payment_amount),
            metadata: { offer_id: parsed.data.offer_id },
          });

          return jsonResponse({ data: { reference: ref, provider_order: order.data, status: "confirmed" } }, 201);
        }),
    },
  },
});
