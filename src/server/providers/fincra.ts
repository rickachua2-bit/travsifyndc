// Fincra client — supplier payouts, virtual accounts (NGN funding), card charges.
// Docs: https://docs.fincra.com/reference
const BASE = "https://api.fincra.com";

function key(): string {
  const k = process.env.FINCRA_API_KEY;
  if (!k) throw new Error("FINCRA_API_KEY not configured");
  return k;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "api-key": key(),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json as { message?: string };
    throw new Error(err.message || `Fincra error ${res.status}`);
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
  return call<{ data?: { link?: string; reference?: string } }>("/checkout/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: String(input.amount),
      currency: "NGN",
      reference: input.reference,
      customer: { name: input.customer_name, email: input.email },
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
