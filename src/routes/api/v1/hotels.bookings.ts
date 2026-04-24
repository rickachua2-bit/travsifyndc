import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { prebookHotel, bookHotel } from "@/server/providers/liteapi";
import {
  createBookingAndDebit,
  confirmBooking,
  failAndRefundBooking,
  InsufficientFundsError,
} from "@/server/bookings";

const Schema = z.object({
  offer_id: z.string().min(1).max(300),
  holder: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email().max(255),
  }),
  guests: z.array(z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email().max(255),
  })).min(1).max(8),
  base_amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3),
});

export const Route = createFileRoute("/api/v1/hotels/bookings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/hotels/bookings", vertical: "hotels", provider: "liteapi" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          // 1. Markup + wallet debit
          let created;
          try {
            created = await createBookingAndDebit({
              key,
              vertical: "hotels",
              provider: "liteapi",
              fulfillmentMode: "auto",
              providerBase: parsed.data.base_amount,
              currency: parsed.data.currency,
              customer: {
                name: `${parsed.data.holder.firstName} ${parsed.data.holder.lastName}`,
                email: parsed.data.holder.email,
              },
              metadata: { offer_id: parsed.data.offer_id, holder: parsed.data.holder, guests: parsed.data.guests },
            });
          } catch (e) {
            if (e instanceof InsufficientFundsError) {
              return errorResponse("insufficient_funds", e.message, 402);
            }
            throw e;
          }

          // 2. Pre-book + book on LiteAPI
          try {
            const prebook = await prebookHotel(parsed.data.offer_id) as { data?: { prebookId?: string } };
            const prebookId = prebook?.data?.prebookId;
            if (!prebookId) throw new Error("prebook_failed: could not lock the rate");

            const booked = await bookHotel({
              prebookId,
              guests: parsed.data.guests,
              holder: parsed.data.holder,
              payment: { method: "ACC_CREDIT_CARD" },
            }) as { data?: { bookingId?: string } };

            const providerRef = booked.data?.bookingId || prebookId;
            await confirmBooking(created.bookingId, providerRef, { liteapi_booking: booked.data });
            return jsonResponse({
              data: {
                reference: created.reference,
                status: "confirmed",
                price: created.price,
                provider_booking: booked.data,
              },
            }, 201);
          } catch (e) {
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
