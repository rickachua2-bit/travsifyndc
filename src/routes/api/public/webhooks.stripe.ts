import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyStripeSignature, retrievePaymentMethod } from "@/server/providers/stripe";

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
            } else if (meta.booking_reference) {
              await supabaseAdmin.from("bookings").update({ status: "confirmed", stripe_payment_intent: pi.id })
                .eq("reference", meta.booking_reference);
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
