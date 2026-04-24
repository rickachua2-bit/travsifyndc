// Fincra client — supplier payouts.
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
  return call("/disbursements/payouts", {
    method: "POST",
    body: JSON.stringify({
      sourceCurrency: input.currency,
      destinationCurrency: input.currency,
      amount: input.amount,
      description: input.description || "Travsify supplier payout",
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
