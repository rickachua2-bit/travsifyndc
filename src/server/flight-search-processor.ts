import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { composePrice } from "@/server/bookings";
import { searchFlights } from "@/server/providers/duffel";
import { ProviderTimeoutError } from "@/server/providers/fetch-with-timeout";
import { isNdcEnabled, ndcSearch } from "@/server/providers/ndc";

type ProcessorResult =
  | { status: "succeeded"; offers: number }
  | { status: "failed"; reason: string }
  | { status: "noop" };

export async function processFlightSearchJob(jobId: string): Promise<ProcessorResult> {
  const { data: existing } = await supabaseAdmin
    .from("flight_search_jobs")
    .select("attempts")
    .eq("id", jobId)
    .maybeSingle();
  const nextAttempts = (existing?.attempts ?? 0) + 1;
  if (nextAttempts > 3) {
    await supabaseAdmin
      .from("flight_search_jobs")
      .update({
        status: "failed",
        error_code: "max_attempts_exceeded",
        error_message: "Search could not be completed after 3 attempts.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return { status: "failed", reason: "max_attempts" };
  }

  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("flight_search_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), attempts: nextAttempts })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id, user_id, environment, input")
    .maybeSingle();

  if (claimErr) throw new Error(`Flight search claim failed: ${claimErr.message}`);
  if (!claimed) return { status: "noop" };

  const input = claimed.input as {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string;
    adults: number;
    cabin: "economy" | "premium_economy" | "business" | "first";
  };

  // ---- Provider strategy ---------------------------------------------------
  // xml.agency (NDC) is the PRIMARY supplier. Duffel is a fallback that we
  // only call if xml.agency returned zero usable offers OR errored. This
  // matches the "xml.agency primary, Duffel fallback" production policy.
  const suppliersCalled: string[] = [];
  let ndcOffers: Array<Record<string, unknown>> = [];
  let ndcError: Error | null = null;

  if (isNdcEnabled()) {
    suppliersCalled.push("xmlagency");
    try {
      const r = await ndcSearch(input);
      ndcOffers = (r as { offers: Array<Record<string, unknown>> }).offers || [];
    } catch (e) {
      ndcError = e as Error;
      console.error("[process-flight-search] xml.agency failed", ndcError.message);
    }
  }

  let duffelOffers: Array<Record<string, unknown>> = [];
  let duffelError: Error | null = null;
  if (ndcOffers.length === 0) {
    suppliersCalled.push("duffel");
    try {
      const r = await searchFlights(claimed.environment as "sandbox" | "live", input);
      duffelOffers = r.offers as Array<Record<string, unknown>>;
    } catch (e) {
      duffelError = e as Error;
      console.error("[process-flight-search] Duffel fallback failed", duffelError.message);
    }
  }

  if (ndcOffers.length === 0 && duffelOffers.length === 0) {
    const reason = ndcError || duffelError;
    const isTimeout = reason instanceof ProviderTimeoutError;
    await supabaseAdmin
      .from("flight_search_jobs")
      .update({
        status: "failed",
        error_code: isTimeout ? "upstream_timeout" : (reason ? "supplier_error" : "no_offers"),
        error_message: reason?.message || "No offers returned by any supplier",
        suppliers_called: suppliersCalled,
        completed_at: new Date().toISOString(),
      })
      .eq("id", claimed.id);
    return { status: "failed", reason: reason?.message || "no_offers" };
  }

  const allOffers = [
    ...ndcOffers.map((o) => ({ ...o, source: "xmlagency" })),
    ...duffelOffers.map((o) => ({ ...o, source: "duffel" })),
  ];
  const priced = await Promise.all(allOffers.map(async (o) => {
    const baseAmount = Number((o as Record<string, unknown>).total_amount);
    const currency = String((o as Record<string, unknown>).total_currency || "USD");
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) return o;
    try {
      const price = await composePrice({
        partnerId: claimed.user_id,
        vertical: "flights",
        providerBase: baseAmount,
        currency,
      });
      return {
        ...o,
        base_amount: baseAmount.toFixed(2),
        total_amount: price.total.toFixed(2),
        price_breakdown: price,
      };
    } catch (e) {
      console.error("[process-flight-search] composePrice failed", e);
      return o;
    }
  }));

  await supabaseAdmin
    .from("flight_search_jobs")
    .update({
      status: "succeeded",
      result: { flights: priced, suppliers_called: suppliersCalled },
      suppliers_called: suppliersCalled,
      completed_at: new Date().toISOString(),
    })
    .eq("id", claimed.id);

  return { status: "succeeded", offers: priced.length };
}