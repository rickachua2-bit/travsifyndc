import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyFincraSignature } from "@/server/providers/fincra";

export const Route = createFileRoute("/api/public/webhooks/fincra")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.FINCRA_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook secret not configured", { status: 500 });
        const sig = request.headers.get("signature") || request.headers.get("x-fincra-signature") || "";
        const body = await request.text();
        const ok = await verifyFincraSignature(body, sig, secret);
        if (!ok) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(body) as { event?: string; data?: Record<string, unknown> };
        try {
          // Inbound NGN funding via virtual account
          if (event.event === "virtualaccount.collection.successful" || event.event === "collection.successful") {
            const data = event.data || {};
            const amount = Number(data.amount || 0);
            const reference = String(data.reference || data._id || "");
            // Find the user via virtual account number
            const accountNumber = (data.virtualAccount as Record<string, unknown> | undefined)?.accountNumber as string | undefined;
            if (accountNumber) {
              const { data: vacc } = await supabaseAdmin.from("fincra_virtual_accounts").select("user_id").eq("account_number", accountNumber).maybeSingle();
              if (vacc?.user_id && amount > 0 && reference) {
                await supabaseAdmin.rpc("wallet_credit", {
                  p_user_id: vacc.user_id,
                  p_currency: "NGN",
                  p_amount: amount,
                  p_category: "funding",
                  p_reference: `fincra_${reference}`,
                  p_description: "NGN wallet funding (bank transfer)",
                  p_provider: "fincra",
                  p_provider_reference: reference,
                  p_booking_id: undefined,
                  p_metadata: data as never,
                });
              }
            }
          } else if (event.event === "payout.successful") {
            const data = event.data || {};
            const ref = String(data.customerReference || data.reference || "");
            // ref format: wd_<withdrawal_id>
            if (ref.startsWith("wd_")) {
              const id = ref.slice(3);
              await supabaseAdmin.from("withdrawal_requests").update({
                status: "paid",
                paid_at: new Date().toISOString(),
                provider_reference: String(data.reference || data._id || ref),
              }).eq("id", id);
            }
          } else if (event.event === "payout.failed") {
            const data = event.data || {};
            const ref = String(data.customerReference || data.reference || "");
            if (ref.startsWith("wd_")) {
              const id = ref.slice(3);
              const { data: w } = await supabaseAdmin.from("withdrawal_requests").select("*").eq("id", id).maybeSingle();
              if (w && w.status !== "paid") {
                await supabaseAdmin.from("withdrawal_requests").update({ status: "failed" }).eq("id", id);
                // Refund the wallet
                await supabaseAdmin.rpc("wallet_credit", {
                  p_user_id: w.user_id,
                  p_currency: w.currency,
                  p_amount: w.amount,
                  p_category: "refund",
                  p_reference: `refund_${w.id}`,
                  p_description: `Withdrawal failed: ${data.message || "provider error"}`,
                  p_provider: "fincra",
                  p_provider_reference: undefined,
                  p_booking_id: undefined,
                  p_metadata: { withdrawal_id: w.id },
                });
              }
            }
          }
        } catch (e) {
          console.error("fincra webhook handler error:", e);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
