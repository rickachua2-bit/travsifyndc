import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyStripeSignature, retrievePaymentMethod } from "@/server/providers/stripe";
import { createOrder as duffelOrder } from "@/server/providers/duffel";
import { prebookHotel as liteapiPrebook, bookHotel as liteapiBook } from "@/server/providers/liteapi";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook secret not configured", { status: 500 });
        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 401 });
        const body = await request.text();
        const ok = await verifyStripeSignature(body, sig, secret);
        if (!ok) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
        try {
          if (event.type === "payment_intent.succeeded") {
            const pi = event.data.object as { id: string; amount: number; currency: string; metadata?: Record<string, string> };
            const meta = pi.metadata || {};

            if (meta.kind === "wallet_funding" && meta.user_id && meta.currency && meta.reference) {
              await supabaseAdmin.rpc("wallet_credit", {
                p_user_id: meta.user_id,
                p_currency: meta.currency,
                p_amount: pi.amount / 100,
                p_category: "funding",
                p_reference: meta.reference,
                p_description: "USD wallet funding (Stripe)",
                p_provider: "stripe",
                p_provider_reference: pi.id,
                p_booking_id: undefined,
                p_metadata: { stripe_payment_intent: pi.id },
              });
            } else if (meta.kind === "guest_booking" && meta.booking_id) {
              await fulfillGuestBooking(meta.booking_id, pi.id);
            } else if (meta.booking_reference) {
              await supabaseAdmin.from("bookings").update({ status: "confirmed", stripe_payment_intent: pi.id })
                .eq("reference", meta.booking_reference);
            }
          } else if (event.type === "payment_intent.payment_failed") {
            const pi = event.data.object as { id: string; metadata?: Record<string, string> };
            const meta = pi.metadata || {};
            if (meta.kind === "guest_booking" && meta.booking_id) {
              await supabaseAdmin.from("bookings")
                .update({ status: "failed", metadata: { failure_reason: "Stripe payment failed" } as never })
                .eq("id", meta.booking_id);
            }
          } else if (event.type === "setup_intent.succeeded") {
            const si = event.data.object as { id: string; payment_method: string; metadata?: Record<string, string> };
            const userId = si.metadata?.user_id;
            if (userId && si.payment_method) {
              const pm = await retrievePaymentMethod(si.payment_method);
              await supabaseAdmin.from("saved_cards").upsert({
                user_id: userId,
                provider: "stripe",
                provider_payment_method_id: pm.id,
                brand: pm.card?.brand ?? null,
                last4: pm.card?.last4 ?? null,
                exp_month: pm.card?.exp_month ?? null,
                exp_year: pm.card?.exp_year ?? null,
              }, { onConflict: "user_id,provider_payment_method_id" });
            }
          }
        } catch (e) {
          console.error("stripe webhook handler error:", e);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});

/**
 * Promote a paid guest booking. For auto verticals (flights, hotels) issue the
 * supplier order now. For manual verticals, mark `processing` so ops fulfills.
 * Errors are caught and stored on the booking — refunds are handled manually
 * for guest flow (Stripe refund) by ops.
 */
async function fulfillGuestBooking(bookingId: string, paymentIntentId: string) {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return;

  const meta = (booking.metadata as Record<string, unknown>) || {};
  const payload = (meta.payload as Record<string, unknown>) || {};
  const vertical = booking.vertical as string;
  const fulfillment = booking.fulfillment_mode as "auto" | "manual";

  // Always record the payment intent so finance can reconcile.
  const baseUpdate = { stripe_payment_intent: paymentIntentId };

  if (fulfillment === "manual") {
    // Manual verticals: mark processing for ops.
    await supabaseAdmin.from("bookings")
      .update({ ...baseUpdate, status: "processing" })
      .eq("id", bookingId);

    // Visas: also auto-create a structured visa_application + traveler row so
    // the customer can immediately upload supporting documents and track status
    // via /visa/track/$reference. Other manual verticals stay in the bookings
    // table only — they don't need a multi-step wizard.
    if (vertical === "visas") {
      try { await maybeCreateVisaApplication(bookingId); }
      catch (e) { console.error("auto-create visa application failed:", e); }
    }
    return;
  }

  // Auto verticals: call supplier now.
  try {
    if (vertical === "flights") {
      const order = await duffelOrder("live", {
        offer_id: String(payload.offer_id || ""),
        passengers: (payload.passengers as Array<{
          given_name: string; family_name: string; born_on: string;
          gender: "m" | "f"; title: "mr" | "ms" | "mrs" | "miss" | "dr";
          email: string; phone_number: string;
        }>) || [],
        payment_amount: String((meta as Record<string, unknown>).provider_amount ?? booking.total_amount),
        payment_currency: String(booking.currency),
      });
      const orderData = order.data as Record<string, unknown>;
      await supabaseAdmin.from("bookings")
        .update({
          ...baseUpdate,
          status: "confirmed",
          provider_reference: (orderData.id as string) || null,
          metadata: { ...meta, supplier_order: orderData } as never,
        })
        .eq("id", bookingId);
    } else if (vertical === "hotels") {
      const pre = await liteapiPrebook(String(payload.offer_id || "")) as { data?: { prebookId?: string } };
      const prebookId = pre.data?.prebookId;
      if (!prebookId) throw new Error("Prebook failed");
      const holder = (payload.holder as { firstName: string; lastName: string; email: string }) || {
        firstName: String(booking.customer_name || "Guest").split(" ")[0],
        lastName: String(booking.customer_name || "Guest").split(" ")[1] || "Guest",
        email: String(booking.customer_email || ""),
      };
      const guests = (payload.guests as Array<{ firstName: string; lastName: string; email: string }>) || [holder];
      const booked = await liteapiBook({
        prebookId,
        guests,
        holder,
        payment: { method: "WALLET" },
      }) as { data?: { bookingId?: string } };
      await supabaseAdmin.from("bookings")
        .update({
          ...baseUpdate,
          status: "confirmed",
          provider_reference: booked.data?.bookingId || prebookId,
          metadata: { ...meta, supplier_order: booked.data } as never,
        })
        .eq("id", bookingId);
    }
  } catch (e) {
    await supabaseAdmin.from("bookings")
      .update({
        ...baseUpdate,
        status: "failed",
        metadata: { ...meta, failure_reason: (e as Error).message } as never,
      })
      .eq("id", bookingId);
  }
}

/**
 * After a paid visa booking goes to `processing`, create a matching
 * visa_application + primary traveler so the customer can immediately
 * upload supporting documents and track status. Idempotent — re-runs of
 * the webhook for the same booking won't create duplicates.
 */
async function maybeCreateVisaApplication(bookingId: string): Promise<void> {
  // Idempotency: skip if an application already exists for this booking.
  const { data: existing } = await supabaseAdmin
    .from("visa_applications")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing) return;

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, user_id, reference, customer_name, customer_email, currency, total_amount, metadata")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return;

  const meta = (booking.metadata as Record<string, unknown>) || {};
  const payload = (meta.payload as Record<string, unknown>) || {};
  const breakdown = (meta.price_breakdown as { provider_base?: number; travsify_markup?: number; total?: number }) || {};
  const visaProductId = String(payload.visa_product_id || "");
  if (!visaProductId) {
    console.error(`visa booking ${booking.reference} missing visa_product_id in metadata`);
    return;
  }

  const applicant = (payload.applicant as {
    firstName?: string; lastName?: string; email?: string;
    dateOfBirth?: string; passportNumber?: string; passportExpiry?: string;
    nationality?: string;
  }) || {};
  const travelDates = (payload.travel_dates as { arrival?: string; departure?: string }) || {};

  const reference = "VAP-" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const visa_fee = Number(breakdown.provider_base ?? booking.total_amount);
  const service_fee = Number(breakdown.travsify_markup ?? 0);
  const total_amount = Number(breakdown.total ?? booking.total_amount);
  const fullName = `${applicant.firstName ?? ""} ${applicant.lastName ?? ""}`.trim() || (booking.customer_name ?? "Applicant");

  const { data: app, error } = await supabaseAdmin
    .from("visa_applications")
    .insert({
      reference,
      user_id: booking.user_id,
      visa_product_id: visaProductId,
      booking_id: booking.id,
      customer_email: (booking.customer_email ?? "").toLowerCase(),
      customer_name: fullName,
      arrival_date: travelDates.arrival || null,
      departure_date: travelDates.departure || null,
      currency: booking.currency,
      visa_fee,
      service_fee,
      total_amount,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      metadata: { source: "stripe_webhook", booking_payload: payload } as never,
    })
    .select("id, reference")
    .single();
  if (error || !app) { console.error("visa app insert failed:", error); return; }

  await supabaseAdmin.from("visa_application_travelers").insert({
    application_id: app.id,
    position: 1,
    is_primary: true,
    full_name: fullName,
    given_names: applicant.firstName ?? null,
    surname: applicant.lastName ?? null,
    date_of_birth: applicant.dateOfBirth || null,
    passport_number: applicant.passportNumber ?? null,
    passport_expiry_date: applicant.passportExpiry || null,
    nationality: applicant.nationality ?? null,
    passport_issuing_country: applicant.nationality ?? null,
  });

  await supabaseAdmin.from("visa_application_events").insert({
    application_id: app.id,
    event_type: "submitted",
    message: "Application submitted. Please upload required supporting documents.",
    is_customer_visible: true,
  });
}
