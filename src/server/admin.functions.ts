// Admin server functions for manual booking fulfillment.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth as authMiddleware } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { refundWallet } from "@/server/bookings";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admins only");
}

export const listManualBookings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { status?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const status = data.status || "processing";
    const { data: rows } = await supabaseAdmin
      .from("bookings")
      .select("id, reference, vertical, provider, customer_name, customer_email, total_amount, currency, status, created_at, metadata, provider_reference")
      .eq("fulfillment_mode", "manual")
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(200);
    return { bookings: rows ?? [] };
  });

export const confirmManualBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ booking_id: z.string().uuid(), provider_reference: z.string().min(1).max(200) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: existing } = await supabaseAdmin.from("bookings").select("metadata").eq("id", data.booking_id).maybeSingle();
    const merged = { ...((existing?.metadata as Record<string, unknown>) ?? {}), fulfilled_by: context.userId, fulfilled_at: new Date().toISOString() };
    await supabaseAdmin.from("bookings").update({ status: "confirmed", provider_reference: data.provider_reference, metadata: merged as never }).eq("id", data.booking_id);
    return { ok: true };
  });

export const cancelManualBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ booking_id: z.string().uuid(), reason: z.string().min(2).max(300) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: b } = await supabaseAdmin.from("bookings").select("*").eq("id", data.booking_id).maybeSingle();
    if (!b) throw new Error("Booking not found");
    if (b.status !== "processing") throw new Error(`Cannot cancel booking in status ${b.status}`);
    await refundWallet({
      userId: b.user_id,
      currency: b.currency,
      amount: Number(b.total_amount),
      reference: `refund_${b.reference}`,
      bookingId: b.id,
      reason: data.reason,
    });
    await supabaseAdmin.from("bookings").update({ status: "cancelled", metadata: { ...(b.metadata as Record<string, unknown> ?? {}), cancel_reason: data.reason, cancelled_by: context.userId } as never }).eq("id", b.id);
    return { ok: true };
  });
