import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createOrder } from "@/server/providers/duffel";
import {
  createBookingAndDebit,
  confirmBooking,
  failAndRefundBooking,
  InsufficientFundsError,
} from "@/server/bookings";

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
  base_amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3),
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

          const passenger = parsed.data.passengers[0];
          const baseAmount = Number(parsed.data.base_amount);

          // 1. Compose price + debit wallet up-front
          let created;
          try {
            created = await createBookingAndDebit({
              key,
              vertical: "flights",
              provider: "duffel",
              fulfillmentMode: "auto",
              providerBase: baseAmount,
              currency: parsed.data.currency,
              customer: {
                name: `${passenger.given_name} ${passenger.family_name}`,
                email: passenger.email,
              },
              metadata: { offer_id: parsed.data.offer_id, passengers: parsed.data.passengers },
            });
          } catch (e) {
            if (e instanceof InsufficientFundsError) {
              return errorResponse("insufficient_funds", e.message, 402);
            }
            throw e;
          }

          // 2. Place the actual NDC order on Duffel using PROVIDER BASE (we keep markup as margin)
          try {
            const order = await createOrder(key.environment, {
              offer_id: parsed.data.offer_id,
              passengers: parsed.data.passengers,
              payment_amount: baseAmount.toFixed(2),
              payment_currency: parsed.data.currency,
            });
            const providerRef = (order.data as Record<string, unknown>).id as string;
            await confirmBooking(created.bookingId, providerRef, { duffel_order: order.data });
            return jsonResponse({
              data: {
                reference: created.reference,
                status: "confirmed",
                price: created.price,
                provider_order: order.data,
              },
            }, 201);
          } catch (e) {
            // 3. Supplier failed — refund wallet and mark booking failed.
            await failAndRefundBooking({
              bookingId: created.bookingId,
              reference: created.reference,
              userId: key.userId,
              currency: parsed.data.currency,
              amount: created.price.total,
              reason: (e as Error).message,
            });
            return errorResponse("supplier_error", `Booking failed at supplier: ${(e as Error).message}. Wallet refunded.`, 502);
          }
        }),
    },
  },
});
