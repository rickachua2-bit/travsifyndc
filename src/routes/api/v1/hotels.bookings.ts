import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS, genBookingRef } from "@/server/gateway";
import { prebookHotel, bookHotel } from "@/server/providers/liteapi";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  total_amount: z.number().positive().max(1_000_000),
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

          const prebook = await prebookHotel(parsed.data.offer_id) as { data?: { prebookId?: string } };
          const prebookId = prebook?.data?.prebookId;
          if (!prebookId) return errorResponse("prebook_failed", "Could not lock the rate.", 502);

          const booked = await bookHotel({
            prebookId,
            guests: parsed.data.guests,
            holder: parsed.data.holder,
            payment: { method: "ACC_CREDIT_CARD" },
          }) as { data?: { bookingId?: string } };

          const ref = genBookingRef();
          await supabaseAdmin.from("bookings").insert({
            user_id: key.userId,
            api_key_id: key.apiKeyId,
            environment: key.environment,
            vertical: "hotels",
            provider: "liteapi",
            provider_reference: booked.data?.bookingId,
            reference: ref,
            status: "confirmed",
            customer_email: parsed.data.holder.email,
            customer_name: `${parsed.data.holder.firstName} ${parsed.data.holder.lastName}`,
            currency: parsed.data.currency,
            total_amount: parsed.data.total_amount,
            metadata: { offer_id: parsed.data.offer_id },
          });

          return jsonResponse({ data: { reference: ref, provider_booking: booked.data, status: "confirmed" } }, 201);
        }),
    },
  },
});
