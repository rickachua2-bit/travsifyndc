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
  metadata?: Record<string, string>;
};

export async function createPaymentIntent(input: PaymentIntentInput) {
  const body: Record<string, string | number | undefined> = {
    amount: Math.round(input.amount),
    currency: input.currency.toLowerCase(),
    "automatic_payment_methods[enabled]": "true",
    description: input.description,
    receipt_email: input.customer_email,
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
  return call<{ id: string; status: string; amount: number; currency: string }>(`/payment_intents/${id}`);
}
