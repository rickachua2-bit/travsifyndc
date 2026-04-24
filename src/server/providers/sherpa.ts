// Sherpa client — visa & travel-document requirements + e-visa applications.
// Affiliate model: we use our affiliate token; customers fill the application in our flow,
// ops submits to Sherpa portal manually after wallet payment.
// Docs: https://developers.joinsherpa.com/
const BASE = "https://requirements-api.joinsherpa.com/v2";

function affiliateId(): string {
  // Sherpa uses an affiliate ID (no token/secret). Stored as SHERPA_AFFILIATE_ID
  // (legacy SHERPA_AFFILIATE_TOKEN is also accepted for backwards compatibility).
  const id = process.env.SHERPA_AFFILIATE_ID || process.env.SHERPA_AFFILIATE_TOKEN;
  if (!id) throw new Error("SHERPA_AFFILIATE_ID not configured");
  return id;
}

async function call<T>(path: string): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}affiliate=${affiliateId()}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`Sherpa error ${res.status}: ${text.slice(0, 200)}`);
  }
  return json as T;
}

export type VisaSearchInput = {
  nationality: string;       // ISO-2, e.g. "NG"
  destination: string;       // ISO-2, e.g. "AE"
  purpose?: "tourism" | "business" | "transit";
};

export type VisaOption = {
  id: string;
  name: string;          // e.g. "UAE 30-Day E-Visa"
  visa_type: string;     // "evisa" | "voa" | "embassy"
  duration_days: number;
  processing_time: string;
  price: number;
  currency: string;
  requirements: string[];
};

export async function searchVisas(input: VisaSearchInput): Promise<{ options: VisaOption[] }> {
  const path = `/entry-requirements?nationality=${input.nationality}&destination=${input.destination}` +
    (input.purpose ? `&purpose=${input.purpose}` : "");
  const res = await call<{ data?: Array<Record<string, unknown>> }>(path);
  const items = (res.data || []).filter((d) => (d.type as string) === "VISA");
  return {
    options: items.map((d) => {
      const attr = (d.attributes as Record<string, unknown>) || {};
      const cost = (attr.cost as Record<string, unknown>) || {};
      return {
        id: String(d.id),
        name: String(attr.title || "Visa"),
        visa_type: String(attr.category || "evisa"),
        duration_days: Number(attr.duration || 30),
        processing_time: String(attr.processingTime || "3-7 business days"),
        price: Number(cost.amount || 0),
        currency: String(cost.currency || "USD"),
        requirements: ((attr.documents as Array<Record<string, unknown>> | undefined) || []).map((r) => String(r.title || r.name)),
      };
    }),
  };
}

/** Sherpa affiliate flow: capture intent. Ops submits the actual application portal-side. */
export async function captureVisaApplication(input: {
  visa_option_id: string;
  applicant: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    passport_number: string;
    passport_expiry: string;
    nationality: string;
    email: string;
  };
  travel_dates: { arrival: string; departure: string };
}) {
  return {
    captured: true,
    visa_option_id: input.visa_option_id,
    applicant_email: input.applicant.email,
    submission_required: true,
  };
}
