import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { withGateway, jsonResponse, errorResponse, API_CORS_HEADERS } from "@/server/gateway";
import { createPayout } from "@/server/providers/fincra";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  amount: z.number().positive().max(100_000_000),
  currency: z.string().length(3),
  beneficiary_name: z.string().min(1).max(120),
  beneficiary_account: z.string().min(4).max(40),
  beneficiary_bank_code: z.string().max(20).optional(),
  reference: z.string().min(3).max(40),
  description: z.string().max(255).optional(),
  booking_reference: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/v1/payouts")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: API_CORS_HEADERS }),
      POST: async ({ request }) =>
        withGateway(request, { endpoint: "/v1/payouts", vertical: "payouts", provider: "fincra" }, async (key) => {
          let body: unknown;
          try { body = await request.json(); } catch { return errorResponse("invalid_json", "Body must be valid JSON.", 400); }
          const parsed = Schema.safeParse(body);
          if (!parsed.success) return errorResponse("validation_error", parsed.error.issues[0].message, 400);

          let bookingId: string | null = null;
          if (parsed.data.booking_reference) {
            const { data: b } = await supabaseAdmin
              .from("bookings").select("id").eq("user_id", key.userId).eq("reference", parsed.data.booking_reference).maybeSingle();
            bookingId = b?.id ?? null;
          }

          const payout = await createPayout(parsed.data) as { data?: { id?: string; reference?: string } };

          await supabaseAdmin.from("payouts").insert({
            user_id: key.userId,
            booking_id: bookingId,
            provider: "fincra",
            provider_reference: payout.data?.id || payout.data?.reference,
            currency: parsed.data.currency,
            amount: parsed.data.amount,
            status: "processing",
            metadata: { reference: parsed.data.reference },
          });

          return jsonResponse({ data: { provider_reference: payout.data?.id, status: "processing" } }, 201);
        }),
    },
  },
});
