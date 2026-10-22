import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { composePrice } from "@/server/bookings";
import { ProviderTimeoutError } from "@/server/providers/fetch-with-timeout";
import { searchBothFlightSuppliers, cheapestFlightsFirst } from "./flight-search.server";

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

  const search = await searchBothFlightSuppliers(claimed.environment as "sandbox" | "live", input);
  const suppliersCalled = search.suppliers_called;
  const allOffers = search.offers;
  if (allOffers.length === 0) {
    const reason = search.errors.find((error): error is Error => error instanceof Error);
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
      result: { flights: await cheapestFlightsFirst(priced), suppliers_called: suppliersCalled },
      suppliers_called: suppliersCalled,
      completed_at: new Date().toISOString(),
    })
    .eq("id", claimed.id);

  return { status: "succeeded", offers: priced.length };
}