// Stripe client — payment intents for booking checkout.
// We hit the REST API directly to keep the Worker bundle tiny.
const BASE = "https://api.stripe.com/v1";

function key(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY not configured");
  return k;
}

function form(data: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) if (v !== undefined) usp.set(k, String(v));
  return usp.toString();
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${key()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json as { error?: { message?: string } };
    throw new Error(err.error?.message || `Stripe error ${res.status}`);
  }
  return json as T;
}

export type PaymentIntentInput = {
  amount: number;       // smallest currency unit (e.g. cents)
  currency: string;     // 3-letter ISO
  description?: string;
  customer_email?: string;
  customer_id?: string;
  payment_method?: string;
  off_session?: boolean;
  confirm?: boolean;
  metadata?: Record<string, string>;
};

export async function createPaymentIntent(input: PaymentIntentInput) {
  const body: Record<string, string | number | undefined> = {
    amount: Math.round(input.amount),
    currency: input.currency.toLowerCase(),
    "automatic_payment_methods[enabled]": "true",
    description: input.description,
    receipt_email: input.customer_email,
    customer: input.customer_id,
    payment_method: input.payment_method,
    off_session: input.off_session ? "true" : undefined,
    confirm: input.confirm ? "true" : undefined,
  };
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) body[`metadata[${k}]`] = v;
  }
  return call<{ id: string; client_secret: string; status: string }>("/payment_intents", {
    method: "POST",
    body: form(body),
  });
}

export async function retrievePaymentIntent(id: string) {
  return call<{ id: string; status: string; amount: number; currency: string; metadata?: Record<string, string> }>(`/payment_intents/${id}`);
}

export async function createCustomer(input: { email: string; name?: string; metadata?: Record<string, string> }) {
  const body: Record<string, string | number | undefined> = {
    email: input.email,
    name: input.name,
  };
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) body[`metadata[${k}]`] = v;
  }
  return call<{ id: string; email: string }>("/customers", { method: "POST", body: form(body) });
}

export async function createSetupIntent(input: { customer: string; metadata?: Record<string, string> }) {
  const body: Record<string, string | number | undefined> = {
    customer: input.customer,
    "payment_method_types[]": "card",
    usage: "off_session",
  };
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) body[`metadata[${k}]`] = v;
  }
  return call<{ id: string; client_secret: string; status: string }>("/setup_intents", {
    method: "POST",
    body: form(body),
  });
}

export async function retrieveSetupIntent(id: string) {
  return call<{ id: string; status: string; payment_method: string | null; customer: string | null }>(`/setup_intents/${id}`);
}

export async function retrievePaymentMethod(id: string) {
  return call<{
    id: string;
    type: string;
    card?: { brand: string; last4: string; exp_month: number; exp_year: number };
  }>(`/payment_methods/${id}`);
}

export async function detachPaymentMethod(id: string) {
  return call<{ id: string }>(`/payment_methods/${id}/detach`, { method: "POST", body: form({}) });
}

export async function listPaymentMethods(customerId: string) {
  return call<{ data: Array<{ id: string; card?: { brand: string; last4: string; exp_month: number; exp_year: number } }> }>(
    `/payment_methods?customer=${encodeURIComponent(customerId)}&type=card`,
  );
}

// Verify a Stripe webhook signature (Stripe's v1 scheme).
export async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=").map((s) => s.trim())));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // Constant-time compare
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
