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

/** 
 * Public-ish server function to verify if an authenticated user has admin rights.
 * Used during the /admin-login flow to bypass potential client-side RLS propagation delays.
 */
export const adminVerifyAccess = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });


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

// ============================================================================
// Platform-wide visibility for the super admin console.
// ============================================================================

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { kyc_status?: string; q?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, legal_name, trading_name, company, country, incorporation_country, kyc_status, kyc_submitted_at, kyc_reviewed_at, created_at, monthly_volume, target_verticals",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.kyc_status && data.kyc_status !== "all") {
      query = query.eq(
        "kyc_status",
        data.kyc_status as "draft" | "submitted" | "under_review" | "approved" | "rejected",
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    let result = rows ?? [];
    if (data.q) {
      const s = data.q.toLowerCase();
      result = result.filter(
        (r) =>
          r.full_name?.toLowerCase().includes(s) ||
          r.legal_name?.toLowerCase().includes(s) ||
          r.company?.toLowerCase().includes(s) ||
          r.trading_name?.toLowerCase().includes(s),
      );
    }
    // Pull role flags so we can highlight admins
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return {
      users: result.map((u) => ({ ...u, is_admin: adminIds.has(u.id) })),
    };
  });

export const adminListAllBookings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { status?: string; vertical?: string; q?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let query = supabaseAdmin
      .from("bookings")
      .select(
        "id, reference, vertical, provider, customer_name, customer_email, total_amount, margin_amount, currency, status, environment, created_at, fulfillment_mode, user_id, provider_reference",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.vertical && data.vertical !== "all") query = query.eq("vertical", data.vertical);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    let bookings = rows ?? [];
    if (data.q) {
      const s = data.q.toLowerCase();
      bookings = bookings.filter(
        (r) =>
          r.reference?.toLowerCase().includes(s) ||
          r.customer_name?.toLowerCase().includes(s) ||
          r.customer_email?.toLowerCase().includes(s) ||
          r.provider_reference?.toLowerCase().includes(s),
      );
    }
    return { bookings };
  });

export const adminPlatformStats = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [users, pendingKyc, bookings, processing, withdrawals, visaApps] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).in("kyc_status", ["submitted", "under_review"]),
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).eq("status", "processing"),
      supabaseAdmin.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("visa_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "documents_pending", "documents_verified", "sent_to_embassy"]),
    ]);
    // GMV last 30 days (sum of confirmed bookings, USD-equivalent best-effort: just sum totals grouped by currency)
    const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: gmvRows } = await supabaseAdmin
      .from("bookings")
      .select("total_amount, margin_amount, currency, status, created_at")
      .gte("created_at", sinceIso);
    const gmv: Record<string, { gross: number; margin: number }> = {};
    (gmvRows ?? []).forEach((r) => {
      if (r.status === "cancelled" || r.status === "failed") return;
      const cur = r.currency || "USD";
      gmv[cur] = gmv[cur] || { gross: 0, margin: 0 };
      gmv[cur].gross += Number(r.total_amount || 0);
      gmv[cur].margin += Number(r.margin_amount || 0);
    });
    return {
      counts: {
        users: users.count ?? 0,
        pending_kyc: pendingKyc.count ?? 0,
        bookings: bookings.count ?? 0,
        processing: processing.count ?? 0,
        pending_withdrawals: withdrawals.count ?? 0,
        active_visa_applications: visaApps.count ?? 0,
      },
      gmv_30d: gmv,
    };
  });
