// Shared fetch wrapper with hard timeout for upstream provider calls.
//
// WHY: Cloudflare Workers in front of our origin enforce a request budget
// (~25–30s edge → 522 to the client). When an upstream supplier (Duffel,
// LiteAPI, Sherpa, Mozio, Stripe, …) hangs, the Worker hangs with it and
// Cloudflare returns a 522. We must never allow a single upstream call to
// run longer than ~20s; search calls cap at 12s.
//
// USAGE: providers that previously did `fetch(url, init)` should call
//   `fetchWithTimeout(url, init, { timeoutMs, providerName })`
// and translate timeouts into a typed Error so the gateway maps them to a
// clean 504 instead of a hung request.

export class ProviderTimeoutError extends Error {
  readonly code = "provider_timeout";
  readonly status = 504;
  constructor(provider: string, timeoutMs: number) {
    super(`${provider} timed out after ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
  }
}

export type FetchWithTimeoutOptions = {
  /** Hard ceiling in milliseconds. Defaults to 15_000. */
  timeoutMs?: number;
  /** Human-readable provider name for error messages and logs. */
  providerName: string;
};

/**
 * fetch() that aborts after `timeoutMs` and throws ProviderTimeoutError.
 * Pass-through for everything else (status codes, body, headers).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: FetchWithTimeoutOptions,
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const ctrl = new AbortController();
  // Forward an existing signal if the caller passed one.
  if (init.signal) {
    const upstream = init.signal;
    if (upstream.aborted) ctrl.abort(upstream.reason);
    else upstream.addEventListener("abort", () => ctrl.abort(upstream.reason), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(new ProviderTimeoutError(opts.providerName, timeoutMs)), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } catch (err) {
    // AbortError thrown via ctrl.abort(reason) preserves our typed error as `err.cause` in some runtimes,
    // and as `ctrl.signal.reason` in others. Normalise to ProviderTimeoutError.
    if (ctrl.signal.aborted && ctrl.signal.reason instanceof ProviderTimeoutError) {
      throw ctrl.signal.reason;
    }
    if ((err as Error)?.name === "AbortError") {
      throw new ProviderTimeoutError(opts.providerName, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Default timeouts by call type — tune per workload. */
export const TIMEOUTS = {
  search: 12_000,   // catalog/search: must be quick or skipped
  booking: 20_000,  // create/confirm/payment: a bit more headroom
  light: 8_000,     // health, lookups, idempotent GETs
} as const;
