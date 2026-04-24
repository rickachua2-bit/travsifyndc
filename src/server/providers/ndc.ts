// NDC SiteCity supplier — flights via XML/JSON over HTTP.
// Adapter is intentionally thin: we expose only what's needed for v1 fallback search.

function cfg() {
  return {
    enabled: (process.env.NDC_SITECITY_ENABLED || "false").toLowerCase() === "true",
    searchUrl: process.env.NDC_API_SEARCH_URL || "",
    actionUrl: process.env.NDC_API_ACTION_URL || "",
    token: process.env.NDC_API_TOKEN || "",
    login: process.env.NDC_API_LOGIN || "",
    pass: process.env.NDC_API_PASS || "",
    deviceId: process.env.NDC_API_DEVICE_ID || "Travsify",
  };
}

export function isNdcEnabled(): boolean {
  const c = cfg();
  return c.enabled && !!c.searchUrl && !!c.token;
}

export type NdcSearchInput = {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
};

export async function ndcSearch(_input: NdcSearchInput) {
  if (!isNdcEnabled()) {
    return { offers: [], note: "NDC supplier disabled. Set NDC_SITECITY_ENABLED=true to enable." };
  }
  // Minimal placeholder until SiteCity is fully wired (their API requires partner-specific schema).
  // Returning empty offers rather than throwing keeps the unified search resilient.
  return { offers: [] };
}
