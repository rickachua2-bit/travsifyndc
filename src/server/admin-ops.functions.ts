// Server functions powering the admin "ops" pages: wallets, ledger, API keys,
// API logs, API access requests, contact submissions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth as authMiddleware } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admins only");
}

// ============================================================================
// Wallets
// ============================================================================

export const adminListWallets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { q?: string; currency?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("wallets")
      .select("id, user_id, currency, balance, updated_at, created_at")
      .order("balance", { ascending: false })
      .limit(500);
    if (data.currency && data.currency !== "all") q = q.eq("currency", data.currency);
    const { data: wallets, error } = await q;
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((wallets ?? []).map((w) => w.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, legal_name, company, kyc_status")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    let result = (wallets ?? []).map((w) => ({ ...w, profile: profileMap.get(w.user_id) ?? null }));
    if (data.q) {
      const s = data.q.toLowerCase();
      result = result.filter(
        (r) =>
          r.profile?.full_name?.toLowerCase().includes(s) ||
          r.profile?.legal_name?.toLowerCase().includes(s) ||
          r.profile?.company?.toLowerCase().includes(s),
      );
    }
    // Aggregate totals by currency
    const totals: Record<string, number> = {};
    result.forEach((r) => {
      totals[r.currency] = (totals[r.currency] ?? 0) + Number(r.balance);
    });
    return { wallets: result, totals };
  });

export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      currency: z.enum(["USD", "NGN"]),
      direction: z.enum(["credit", "debit"]),
      amount: z.number().positive().max(10_000_000),
      reason: z.string().min(2).max(300),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const reference = `adj_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    const fn = data.direction === "credit" ? "wallet_credit" : "wallet_debit";
    const { error } = await supabaseAdmin.rpc(fn, {
      p_user_id: data.user_id,
      p_currency: data.currency,
      p_amount: data.amount,
      p_category: "admin_adjustment",
      p_reference: reference,
      p_description: `Admin ${data.direction}: ${data.reason}`,
      p_provider: "admin",
      p_metadata: { actor_id: context.userId, reason: data.reason },
    });
    if (error) throw new Error(error.message);
    return { ok: true, reference };
  });

export const adminListWalletTxns = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    (d: {
      user_id?: string;
      currency?: string;
      direction?: string;
      category?: string;
      q?: string;
      limit?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("wallet_transactions")
      .select(
        "id, user_id, wallet_id, currency, direction, amount, balance_after, category, reference, description, provider, provider_reference, booking_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.user_id) q = q.eq("user_id", data.user_id);
    if (data.currency && data.currency !== "all") q = q.eq("currency", data.currency);
    if (data.direction && data.direction !== "all") q = q.eq("direction", data.direction);
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    const { data: txns, error } = await q;
    if (error) throw new Error(error.message);
    let rows = txns ?? [];
    if (data.q) {
      const s = data.q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.reference?.toLowerCase().includes(s) ||
          r.description?.toLowerCase().includes(s) ||
          r.provider_reference?.toLowerCase().includes(s),
      );
    }
    // Pull profiles for display
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, legal_name, company")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      transactions: rows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null })),
    };
  });

// ============================================================================
// API keys
// ============================================================================

export const adminListApiKeys = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { q?: string; environment?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("api_keys")
      .select(
        "id, user_id, key_prefix, environment, name, last_used_at, revoked_at, rate_limit_per_minute, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.environment && data.environment !== "all") q = q.eq("environment", data.environment);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, legal_name, company")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    let result = (rows ?? []).map((r) => ({ ...r, profile: map.get(r.user_id) ?? null }));
    if (data.q) {
      const s = data.q.toLowerCase();
      result = result.filter(
        (r) =>
          r.key_prefix.toLowerCase().includes(s) ||
          r.name?.toLowerCase().includes(s) ||
          r.profile?.legal_name?.toLowerCase().includes(s) ||
          r.profile?.company?.toLowerCase().includes(s),
      );
    }
    return { keys: result };
  });

export const adminRevokeApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ key_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.key_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateApiKeyRateLimit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ key_id: z.string().uuid(), rate_limit_per_minute: z.number().int().min(1).max(100000) }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ rate_limit_per_minute: data.rate_limit_per_minute })
      .eq("id", data.key_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// API logs
// ============================================================================

export const adminListApiLogs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    (d: {
      environment?: string;
      vertical?: string;
      status_class?: "all" | "2xx" | "4xx" | "5xx";
      user_id?: string;
      q?: string;
      limit?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("api_logs")
      .select(
        "id, user_id, api_key_id, environment, method, endpoint, status_code, latency_ms, provider, vertical, error_code, request_id, ip_address, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.environment && data.environment !== "all") q = q.eq("environment", data.environment);
    if (data.vertical && data.vertical !== "all") q = q.eq("vertical", data.vertical);
    if (data.user_id) q = q.eq("user_id", data.user_id);
    if (data.status_class === "2xx") q = q.gte("status_code", 200).lt("status_code", 300);
    if (data.status_class === "4xx") q = q.gte("status_code", 400).lt("status_code", 500);
    if (data.status_class === "5xx") q = q.gte("status_code", 500);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let logs = rows ?? [];
    if (data.q) {
      const s = data.q.toLowerCase();
      logs = logs.filter(
        (r) =>
          r.endpoint.toLowerCase().includes(s) ||
          r.request_id?.toLowerCase().includes(s) ||
          r.error_code?.toLowerCase().includes(s),
      );
    }
    return { logs };
  });

export const adminApiLogsSummary = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("api_logs")
      .select("status_code, latency_ms, environment")
      .gte("created_at", sinceIso)
      .limit(5000);
    const summary = { total: 0, ok: 0, client_err: 0, server_err: 0, p95_latency: 0, by_env: {} as Record<string, number> };
    const latencies: number[] = [];
    (rows ?? []).forEach((r) => {
      summary.total += 1;
      if (r.status_code >= 200 && r.status_code < 400) summary.ok += 1;
      else if (r.status_code >= 400 && r.status_code < 500) summary.client_err += 1;
      else if (r.status_code >= 500) summary.server_err += 1;
      if (r.latency_ms) latencies.push(r.latency_ms);
      summary.by_env[r.environment] = (summary.by_env[r.environment] ?? 0) + 1;
    });
    latencies.sort((a, b) => a - b);
    summary.p95_latency = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    return summary;
  });

// ============================================================================
// API access requests
// ============================================================================

export const adminListApiRequests = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { status?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("api_access_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { requests: rows ?? [] };
  });

export const adminUpdateApiRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected", "contacted"]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("api_access_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// Contact submissions
// ============================================================================

export const adminListContactSubmissions = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { inquiry_type?: string; q?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.inquiry_type && data.inquiry_type !== "all") q = q.eq("inquiry_type", data.inquiry_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let submissions = rows ?? [];
    if (data.q) {
      const s = data.q.toLowerCase();
      submissions = submissions.filter(
        (r) =>
          r.name?.toLowerCase().includes(s) ||
          r.email?.toLowerCase().includes(s) ||
          r.company?.toLowerCase().includes(s) ||
          r.message?.toLowerCase().includes(s),
      );
    }
    return { submissions };
  });
