// Fincra client — supplier payouts, virtual accounts (NGN funding), card charges.
// Docs: https://docs.fincra.com/reference
const BASE = "https://api.fincra.com";

function key(): string {
  const k = process.env.FINCRA_API_KEY?.trim();
  if (!k) throw new Error("FINCRA_API_KEY not configured");
  return k;
}

function optionalFincraHeaders(): Record<string, string> {
  const businessId = process.env.FINCRA_BUSINESS_ID?.trim();
  const publicKey = process.env.FINCRA_PUBLIC_KEY?.trim();
  return {
    ...(businessId ? { "x-business-id": businessId } : {}),
    ...(publicKey ? { "x-pub-key": publicKey } : {}),
  };
}

function normalizeCustomerName(name: string): { fullName: string; firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Travsify";
  const lastName = parts.slice(1).join(" ") || "Customer";
  return { fullName: `${firstName} ${lastName}`, firstName, lastName };
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function fincraErrorMessage(status: number, payload: unknown): string {
  const err = payload as { message?: string; error?: string; errors?: unknown } | null;
  const detail = err?.message || err?.error || (err?.errors ? JSON.stringify(err.errors) : "");
  const authHint = status === 401 || status === 403
    ? " Check FINCRA_API_KEY and FINCRA_BUSINESS_ID; they must be from the same Fincra mode/account."
    : "";
  return `Fincra error ${status}${detail ? `: ${detail}` : ""}.${authHint}`;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "api-key": key(),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...optionalFincraHeaders(),
      ...(init.headers || {}),
    },
  });
  const json = await readJsonResponse(res);
  if (!res.ok) {
    throw new Error(fincraErrorMessage(res.status, json));
  }
  return json as T;
}

export type PayoutInput = {
  amount: number;
  currency: string;
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_bank_code?: string;
  reference: string;
  description?: string;
};

export async function createPayout(input: PayoutInput) {
  return call<{ data?: { reference?: string; id?: string; status?: string } }>("/disbursements/payouts", {
    method: "POST",
    body: JSON.stringify({
      sourceCurrency: input.currency,
      destinationCurrency: input.currency,
      amount: input.amount,
      description: input.description || "Travsify payout",
      customerReference: input.reference,
      beneficiary: {
        firstName: input.beneficiary_name.split(" ")[0],
        lastName: input.beneficiary_name.split(" ").slice(1).join(" ") || input.beneficiary_name,
        accountNumber: input.beneficiary_account,
        bankCode: input.beneficiary_bank_code,
        type: "individual",
      },
      paymentDestination: "bank_account",
    }),
  });
}

// Issue a per-user NGN virtual bank account that funds their wallet via inbound transfers.
// Docs: https://docs.fincra.com/reference/create-a-virtual-account
export async function createVirtualAccount(input: {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  bvn?: string;
}) {
  return call<{ data?: { accountInformation?: { accountNumber?: string; accountName?: string; bankName?: string; bankCode?: string }; reference?: string; _id?: string } }>(
    "/profile/virtual-accounts/requests",
    {
      method: "POST",
      body: JSON.stringify({
        currency: "NGN",
        accountType: "individual",
        KYCInformation: {
          firstName: input.first_name,
          lastName: input.last_name,
          email: input.email,
          bvn: input.bvn,
        },
        channel: "wema",
      }),
    },
  );
}

// Charge an NGN card via Fincra checkout (returns a hosted link or transaction).
// Docs: https://docs.fincra.com/reference/initiate-payment
export async function createNgnCharge(input: {
  amount: number;
  email: string;
  reference: string;
  customer_name: string;
  redirect_url: string;
}) {
  const { fullName, firstName, lastName } = normalizeCustomerName(input.customer_name);
  return call<{ data?: { link?: string; reference?: string } }>("/checkout/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: String(input.amount),
      currency: "NGN",
      reference: input.reference,
      customer: {
        name: fullName,
        firstName,
        lastName,
        email: input.email,
      },
      paymentMethods: ["card", "bank_transfer"],
      successMessage: "Wallet funded — you can return to Travsify.",
      defaultPaymentMethod: "card",
      redirectUrl: input.redirect_url,
    }),
  });
}

// Verify Fincra webhook signature.
// Fincra sends a SHA512 HMAC of the raw body in the `signature` header, signed with the secret.
export async function verifyFincraSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  if (!sigHeader) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== sigHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sigHeader.charCodeAt(i);
  return diff === 0;
}
