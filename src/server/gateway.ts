// Server-only helpers for the Unified API gateway.
// SECURITY: only import from server routes/functions. Uses service-role client.
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
} as const;

export type AuthedKey = {
  apiKeyId: string;
  userId: string;
  environment: "sandbox" | "live";
  rateLimit: number;
};

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...API_CORS_HEADERS, ...extraHeaders },
  });
}

export function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status);
}

/** Extracts and validates the bearer key. Returns the resolved key row or an error response. */
export async function authenticate(request: Request): Promise<AuthedKey | Response> {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(tsk_(?:live|sandbox)_[a-f0-9]{40,64})$/i);
  if (!m) return errorResponse("unauthorized", "Missing or malformed Bearer token. Use 'Authorization: Bearer tsk_live_…'.", 401);

  const key = m[1];
  const expectedEnv = key.startsWith("tsk_live_") ? "live" : "sandbox";
  const keyHash = hashKey(key);

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, environment, rate_limit_per_minute, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) return errorResponse("server_error", "Auth lookup failed.", 500);
  if (!data) return errorResponse("invalid_key", "API key not recognized.", 401);
  if (data.revoked_at) return errorResponse("revoked_key", "API key has been revoked.", 401);
  if (data.environment !== expectedEnv) return errorResponse("invalid_key", "Key environment mismatch.", 401);

  // Fire-and-forget last_used_at update
  void supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  return {
    apiKeyId: data.id,
    userId: data.user_id,
    environment: data.environment as "sandbox" | "live",
    rateLimit: data.rate_limit_per_minute,
  };
}

/** Sliding-window 1-minute rate limiter. Returns null if allowed, or 429 Response if blocked. */
export async function rateLimit(key: AuthedKey): Promise<Response | null> {
  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("rate_limit_buckets")
    .select("request_count")
    .eq("api_key_id", key.apiKeyId)
    .eq("window_start", windowStart)
    .maybeSingle();

  const next = (existing?.request_count ?? 0) + 1;
  if (next > key.rateLimit) {
    return errorResponse("rate_limited", `Rate limit exceeded (${key.rateLimit}/min). Retry shortly.`, 429);
  }

  if (existing) {
    await supabaseAdmin
      .from("rate_limit_buckets")
      .update({ request_count: next })
      .eq("api_key_id", key.apiKeyId)
      .eq("window_start", windowStart);
  } else {
    await supabaseAdmin.from("rate_limit_buckets").insert({
      api_key_id: key.apiKeyId,
      window_start: windowStart,
      request_count: 1,
    });
    // Best-effort cleanup of buckets older than 5 minutes
    void supabaseAdmin
      .from("rate_limit_buckets")
      .delete()
      .lt("window_start", new Date(Date.now() - 5 * 60_000).toISOString());
  }

  return null;
}

export function genRequestId(): string {
  return "req_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function genBookingRef(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "TVS-";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function logRequest(params: {
  key: AuthedKey | null;
  request: Request;
  endpoint: string;
  status: number;
  startedAt: number;
  provider?: string;
  vertical?: string;
  errorCode?: string;
  requestId: string;
}) {
  try {
    await supabaseAdmin.from("api_logs").insert({
      user_id: params.key?.userId ?? null,
      api_key_id: params.key?.apiKeyId ?? null,
      environment: params.key?.environment ?? "unknown",
      method: params.request.method,
      endpoint: params.endpoint,
      status_code: params.status,
      latency_ms: Date.now() - params.startedAt,
      provider: params.provider ?? null,
      vertical: params.vertical ?? null,
      ip_address: params.request.headers.get("cf-connecting-ip") || params.request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      user_agent: params.request.headers.get("user-agent") || null,
      error_code: params.errorCode ?? null,
      request_id: params.requestId,
    });
  } catch (e) {
    console.error("api_logs insert failed:", e);
  }
}

/** Higher-order wrapper: auth → rate-limit → handler → log. */
export async function withGateway(
  request: Request,
  meta: { endpoint: string; vertical?: string; provider?: string },
  handler: (key: AuthedKey, requestId: string) => Promise<Response>,
): Promise<Response> {
  const startedAt = Date.now();
  const requestId = genRequestId();
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: API_CORS_HEADERS });
  }

  const auth = await authenticate(request);
  if (auth instanceof Response) {
    await logRequest({ key: null, request, endpoint: meta.endpoint, status: auth.status, startedAt, requestId, errorCode: "auth_failed", vertical: meta.vertical, provider: meta.provider });
    return withRequestId(auth, requestId);
  }

  const limited = await rateLimit(auth);
  if (limited) {
    await logRequest({ key: auth, request, endpoint: meta.endpoint, status: 429, startedAt, requestId, errorCode: "rate_limited", vertical: meta.vertical, provider: meta.provider });
    return withRequestId(limited, requestId);
  }

  let res: Response;
  try {
    res = await handler(auth, requestId);
  } catch (e) {
    console.error(`[${meta.endpoint}]`, e);
    res = errorResponse("internal_error", (e as Error).message || "Unexpected error", 500);
  }

  await logRequest({
    key: auth,
    request,
    endpoint: meta.endpoint,
    status: res.status,
    startedAt,
    requestId,
    vertical: meta.vertical,
    provider: meta.provider,
    errorCode: res.status >= 400 ? "handler_error" : undefined,
  });

  return withRequestId(res, requestId);
}

function withRequestId(res: Response, requestId: string): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Request-Id", requestId);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
