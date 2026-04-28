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
// Financial reporting (Phase 2)
// ============================================================================

import { convert as fxConvert } from "@/server/fx";

export const adminRevenueReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    (d: { days?: number; vertical?: string; partner_id?: string; report_currency?: "USD" | "NGN" }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const days = Math.min(Math.max(data.days ?? 30, 1), 365);
    const reportCcy = data.report_currency ?? "USD";
    const sinceIso = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    let q = supabaseAdmin
      .from("bookings")
      .select("id, vertical, provider, total_amount, margin_amount, currency, status, created_at, user_id")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(5000);
    if (data.vertical && data.vertical !== "all") q = q.eq("vertical", data.vertical);
    if (data.partner_id) q = q.eq("user_id", data.partner_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Convert each booking into the report currency.
    type Norm = {
      day: string;
      vertical: string;
      provider: string;
      user_id: string;
      gross: number;
      margin: number;
      status: string;
      bookings: number;
    };
    const normalized: Norm[] = await Promise.all(
      (rows ?? []).map(async (r) => ({
        day: r.created_at.slice(0, 10),
        vertical: r.vertical,
        provider: r.provider,
        user_id: r.user_id,
        gross: await fxConvert(Number(r.total_amount || 0), r.currency, reportCcy),
        margin: await fxConvert(Number(r.margin_amount || 0), r.currency, reportCcy),
        status: r.status,
        bookings: 1,
      })),
    );

    const counted = normalized.filter((r) => r.status !== "cancelled" && r.status !== "failed");

    // Time-series by day
    const byDay = new Map<string, { day: string; gross: number; margin: number; bookings: number }>();
    counted.forEach((r) => {
      const cur = byDay.get(r.day) ?? { day: r.day, gross: 0, margin: 0, bookings: 0 };
      cur.gross += r.gross;
      cur.margin += r.margin;
      cur.bookings += 1;
      byDay.set(r.day, cur);
    });
    // Fill missing days
    const series: { day: string; gross: number; margin: number; bookings: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      series.push(byDay.get(d) ?? { day: d, gross: 0, margin: 0, bookings: 0 });
    }

    // By vertical
    const byVertical = new Map<string, { vertical: string; gross: number; margin: number; bookings: number }>();
    counted.forEach((r) => {
      const cur = byVertical.get(r.vertical) ?? { vertical: r.vertical, gross: 0, margin: 0, bookings: 0 };
      cur.gross += r.gross;
      cur.margin += r.margin;
      cur.bookings += 1;
      byVertical.set(r.vertical, cur);
    });

    // By provider
    const byProvider = new Map<string, { provider: string; gross: number; margin: number; bookings: number }>();
    counted.forEach((r) => {
      const cur = byProvider.get(r.provider) ?? { provider: r.provider, gross: 0, margin: 0, bookings: 0 };
      cur.gross += r.gross;
      cur.margin += r.margin;
      cur.bookings += 1;
      byProvider.set(r.provider, cur);
    });

    // Top partners
    const byPartner = new Map<string, { user_id: string; gross: number; margin: number; bookings: number }>();
    counted.forEach((r) => {
      const cur = byPartner.get(r.user_id) ?? { user_id: r.user_id, gross: 0, margin: 0, bookings: 0 };
      cur.gross += r.gross;
      cur.margin += r.margin;
      cur.bookings += 1;
      byPartner.set(r.user_id, cur);
    });
    const topPartners = Array.from(byPartner.values()).sort((a, b) => b.gross - a.gross).slice(0, 10);
    const partnerIds = topPartners.map((p) => p.user_id);
    const { data: partnerProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, legal_name, company, full_name")
      .in("id", partnerIds.length ? partnerIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((partnerProfiles ?? []).map((p) => [p.id, p]));
    const topPartnersNamed = topPartners.map((p) => ({
      ...p,
      label:
        profileMap.get(p.user_id)?.legal_name ??
        profileMap.get(p.user_id)?.company ??
        profileMap.get(p.user_id)?.full_name ??
        p.user_id.slice(0, 8),
    }));

    const totals = {
      gross: counted.reduce((s, r) => s + r.gross, 0),
      margin: counted.reduce((s, r) => s + r.margin, 0),
      bookings: counted.length,
      cancelled: normalized.filter((r) => r.status === "cancelled" || r.status === "failed").length,
    };

    return {
      report_currency: reportCcy,
      days,
      totals,
      series,
      by_vertical: Array.from(byVertical.values()).sort((a, b) => b.gross - a.gross),
      by_provider: Array.from(byProvider.values()).sort((a, b) => b.gross - a.gross),
      top_partners: topPartnersNamed,
    };
  });

export const adminFxRates = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    // Sample the live rates by converting 1 unit.
    const usdToNgn = await fxConvert(1, "USD", "NGN");
    const ngnToUsd = await fxConvert(1, "NGN", "USD");
    return {
      base: "USD",
      rates: { USD: 1, NGN: usdToNgn },
      inverse: { NGN_USD: ngnToUsd },
      fetched_at: new Date().toISOString(),
      source: "exchangerate.host (1h cache, fallback if down)",
    };
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

// ============================================================================
// Phase 3: Provider & cache health
// ============================================================================

const CACHE_TABLES = [
  { key: "tour_quote_cache", label: "Tours (GetYourGuide)", vertical: "tours" },
  { key: "transfer_quote_cache", label: "Transfers (Mozio)", vertical: "transfers" },
  { key: "insurance_quote_cache", label: "Insurance (SafetyWing)", vertical: "insurance" },
  { key: "car_rental_quote_cache", label: "Car rentals", vertical: "car_rentals" },
] as const;

type CacheKey = (typeof CACHE_TABLES)[number]["key"];

export const adminCacheStats = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const stats = await Promise.all(
      CACHE_TABLES.map(async (t) => {
        const [total, fresh24h, stale7d, latest] = await Promise.all([
          supabaseAdmin.from(t.key).select("id", { count: "exact", head: true }),
          supabaseAdmin
            .from(t.key)
            .select("id", { count: "exact", head: true })
            .gte("last_scraped_at", dayAgo),
          supabaseAdmin
            .from(t.key)
            .select("id", { count: "exact", head: true })
            .lt("last_scraped_at", weekAgo),
          supabaseAdmin
            .from(t.key)
            .select("last_scraped_at")
            .order("last_scraped_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        return {
          key: t.key,
          label: t.label,
          vertical: t.vertical,
          total: total.count ?? 0,
          fresh_24h: fresh24h.count ?? 0,
          stale_7d: stale7d.count ?? 0,
          last_scraped_at: latest.data?.last_scraped_at ?? null,
        };
      }),
    );
    return { caches: stats };
  });

export const adminPurgeCache = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      cache_key: z.enum([
        "tour_quote_cache",
        "transfer_quote_cache",
        "insurance_quote_cache",
        "car_rental_quote_cache",
      ]),
      mode: z.enum(["all", "stale_7d", "stale_24h"]),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const table = data.cache_key as CacheKey;
    let q = supabaseAdmin.from(table).delete();
    if (data.mode === "stale_24h") {
      q = q.lt("last_scraped_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    } else if (data.mode === "stale_7d") {
      q = q.lt("last_scraped_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());
    } else {
      // delete all rows: need a where clause; use uuid sentinel that always matches
      q = q.gte("created_at", "1970-01-01");
    }
    const { error, count } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, deleted: count ?? 0 };
  });

export const adminListScrapeRuns = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("visa_scrape_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { runs: data ?? [] };
  });

export const adminProviderHealth = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("api_logs")
      .select("provider, status_code, latency_ms, created_at, error_code")
      .gte("created_at", sinceIso)
      .not("provider", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    type Agg = {
      provider: string;
      total: number;
      ok: number;
      errors: number;
      latencies: number[];
      last_call_at: string | null;
      last_error: string | null;
      last_status: number | null;
    };
    const map = new Map<string, Agg>();
    (rows ?? []).forEach((r) => {
      if (!r.provider) return;
      const cur =
        map.get(r.provider) ??
        ({
          provider: r.provider,
          total: 0,
          ok: 0,
          errors: 0,
          latencies: [],
          last_call_at: null,
          last_error: null,
          last_status: null,
        } as Agg);
      cur.total += 1;
      if (r.status_code >= 200 && r.status_code < 400) cur.ok += 1;
      else cur.errors += 1;
      if (r.latency_ms) cur.latencies.push(r.latency_ms);
      if (!cur.last_call_at) {
        cur.last_call_at = r.created_at;
        cur.last_status = r.status_code;
        cur.last_error = r.error_code ?? null;
      }
      map.set(r.provider, cur);
    });

    const KNOWN_PROVIDERS = [
      "duffel",
      "ndc",
      "liteapi",
      "mozio",
      "getyourguide",
      "safetywing",
      "sherpa",
      "stripe",
      "fincra",
    ];
    KNOWN_PROVIDERS.forEach((p) => {
      if (!map.has(p)) {
        map.set(p, {
          provider: p,
          total: 0,
          ok: 0,
          errors: 0,
          latencies: [],
          last_call_at: null,
          last_error: null,
          last_status: null,
        });
      }
    });

    const providers = Array.from(map.values()).map((a) => {
      a.latencies.sort((x, y) => x - y);
      const p50 = a.latencies.length ? a.latencies[Math.floor(a.latencies.length * 0.5)] : 0;
      const p95 = a.latencies.length ? a.latencies[Math.floor(a.latencies.length * 0.95)] : 0;
      const errorRate = a.total ? a.errors / a.total : 0;
      const status: "healthy" | "degraded" | "down" | "idle" =
        a.total === 0 ? "idle" : errorRate >= 0.5 ? "down" : errorRate >= 0.1 ? "degraded" : "healthy";
      return {
        provider: a.provider,
        total: a.total,
        ok: a.ok,
        errors: a.errors,
        error_rate: errorRate,
        p50_latency: p50,
        p95_latency: p95,
        last_call_at: a.last_call_at,
        last_status: a.last_status,
        last_error: a.last_error,
        status,
      };
    });
    providers.sort((a, b) => b.total - a.total);
    return { providers, window_hours: 24 };
  });

// ============================================================================
// Inventory Management
// ============================================================================

export const adminListInventory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    vertical: z.enum(["tours", "transfers", "rentals", "insurance", "visas"]),
    q: z.string().optional(),
    limit: z.number().int().optional().default(100)
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    
    const tableMap: Record<string, string> = {
      tours: "tours",
      transfers: "car_transfers",
      rentals: "car_rentals",
      insurance: "insurance_packages",
      visas: "evisas"
    };
    
    const table = tableMap[data.vertical];
    // Some tables might not have created_at, let's check or just default order.
    let q = supabaseAdmin.from(table).select("*").limit(data.limit);
    
    if (data.q) {
      if (data.vertical === "tours") q = q.or(`title.ilike.%${data.q}%,location.ilike.%${data.q}%,country.ilike.%${data.q}%`);
      else if (data.vertical === "transfers") q = q.or(`pickup_address.ilike.%${data.q}%,dropoff_address.ilike.%${data.q}%,country.ilike.%${data.q}%`);
      else if (data.vertical === "rentals") q = q.or(`vehicle_name.ilike.%${data.q}%,location.ilike.%${data.q}%,country.ilike.%${data.q}%`);
      else if (data.vertical === "insurance") q = q.ilike("name", `%${data.q}%`);
      else if (data.vertical === "visas") q = q.or(`destination.ilike.%${data.q}%,country.ilike.%${data.q}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    
    return { rows: rows ?? [] };
  });
