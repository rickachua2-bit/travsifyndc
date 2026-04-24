/**
 * Booking engine — public (guest) and authenticated booking server functions
 * for all six verticals. Same shape; payment path differs:
 *   - Guests pay with Stripe (PaymentIntent + card). Booking is created in
 *     `pending_payment` status, then promoted to `confirmed` (auto verticals)
 *     or `processing` (manual affiliate verticals) by the Stripe webhook.
 *   - Signed-in partners pay from wallet via the existing dashboard server
 *     functions in dashboard.functions.ts.
 *
 * Pricing for guests: provider_base + Travsify markup only (no partner markup
 * since guests have no partner attribution). compose_price() with NULL
 * partner_id returns this exact shape.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { genBookingRef } from "@/server/gateway";
import { createPaymentIntent } from "@/server/providers/stripe";
import { searchFlights as duffelSearch } from "@/server/providers/duffel";
import { searchHotelRates as liteapiSearch } from "@/server/providers/liteapi";
import { searchTours as gygSearch } from "@/server/providers/getyourguide";
import { searchTransfers as mozioSearch } from "@/server/providers/mozio";
import { searchInsurance as swSearch } from "@/server/providers/safetywing";
import { searchVisas as sherpaSearch } from "@/server/providers/sherpa";
import { convert as fxConvert, SUPPORTED_CURRENCIES } from "@/server/fx";

type Vertical = "flights" | "hotels" | "tours" | "transfers" | "insurance" | "visas";

/** Auto verticals settle immediately on payment; manual ones wait for ops fulfillment. */
const FULFILLMENT: Record<Vertical, "auto" | "manual"> = {
  flights: "auto",
  hotels: "auto",
  tours: "manual",
  transfers: "manual",
  insurance: "manual",
  visas: "manual",
};

/**
 * Affiliate verticals: we earn commission via the supplier's affiliate program
 * after manual fulfillment, so the public /book flow must NOT add any Travsify
 * markup. Customer pays the raw provider price (FX-converted to display ccy).
 * Partner API still applies markups normally — that's a separate code path.
 */
const AFFILIATE_VERTICALS: Set<Vertical> = new Set(["tours", "transfers", "insurance", "visas"]);

const PROVIDER: Record<Vertical, string> = {
  flights: "duffel",
  hotels: "liteapi",
  tours: "getyourguide",
  transfers: "mozio",
  insurance: "safetywing",
  visas: "sherpa",
};

const DisplayCurrencyEnum = z.enum(SUPPORTED_CURRENCIES as [string, ...string[]]);

/**
 * Compose the public retail price for the user's chosen *display currency*.
 *
 * 1. Convert the provider's native price into `displayCurrency` (e.g. USD→NGN).
 * 2. Run compose_price() in display currency to apply the Travsify markup.
 *    (Markup config has its own currency; pricing function reads value as-is.)
 */
async function publicPrice(
  vertical: Vertical,
  providerBase: number,
  providerCurrency: string,
  displayCurrency: string = "USD",
): Promise<{ provider_base: number; travsify_markup: number; total: number; currency: string; fx_from: string; fx_to: string }> {
  const target = displayCurrency.toUpperCase();
  const baseInDisplay = await fxConvert(providerBase, providerCurrency, target);
  const baseRounded = Number(baseInDisplay.toFixed(2));

  // Affiliate verticals: zero markup on the public web flow. We earn the
  // supplier's affiliate commission instead, after manual fulfillment.
  if (AFFILIATE_VERTICALS.has(vertical)) {
    return {
      provider_base: baseRounded,
      travsify_markup: 0,
      total: baseRounded,
      currency: target,
      fx_from: providerCurrency.toUpperCase(),
      fx_to: target,
    };
  }

  const { data, error } = await supabaseAdmin.rpc("compose_price", {
    p_partner_id: null as unknown as string,
    p_vertical: vertical,
    p_provider_base: baseRounded,
    p_currency: target,
  });
  if (error) throw new Error(`Price composition failed: ${error.message}`);
  const b = data as { provider_base: number; travsify_markup: number; partner_markup: number; total: number; currency: string };
  return {
    provider_base: Number(b.provider_base),
    travsify_markup: Number(b.travsify_markup),
    total: Number(b.total),
    currency: b.currency,
    fx_from: providerCurrency.toUpperCase(),
    fx_to: target,
  };
}

// =============================================================
// SEARCH (guest, no auth) — returns prices already with markup.
// JSON-stringified results to avoid TanStack's strict type check.
// =============================================================

export const publicSearchFlights = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    origin: z.string().length(3).optional(),
    destination: z.string().length(3).optional(),
    departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    adults: z.number().int().min(1).max(9).optional(),
    children: z.number().int().min(0).max(8).optional(),
    infants: z.number().int().min(0).max(4).optional(),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
    slices: z.array(z.object({
      origin: z.string().length(3),
      destination: z.string().length(3),
      departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).min(1).max(6).optional(),
    display_currency: DisplayCurrencyEnum.optional(),
  }).refine(
    (v) => (v.slices && v.slices.length > 0) || (v.origin && v.destination && v.departure_date),
    { message: "Provide either slices[] or origin+destination+departure_date" },
  ).parse(d))
  .handler(async ({ data }): Promise<string> => {
    const display = data.display_currency || "USD";
    const res = await duffelSearch("live", {
      origin: data.origin || data.slices?.[0]?.origin || "",
      destination: data.destination || data.slices?.[0]?.destination || "",
      departure_date: data.departure_date || data.slices?.[0]?.departure_date || "",
      return_date: data.return_date,
      adults: data.adults,
      children: data.children,
      infants: data.infants,
      cabin: data.cabin,
      slices: data.slices,
    });
    const offers = await Promise.all(res.offers.map(async (o) => {
      const base = Number(o.total_amount);
      const ccy = String(o.total_currency || "USD");
      const price = await publicPrice("flights", base, ccy, display);
      return {
        ...o,
        base_amount: base,         // provider native (for booking call)
        base_currency: ccy,        // provider native currency
        total_amount: String(price.total),
        total_currency: price.currency,
        price_breakdown: price,
      };
    }));
    return JSON.stringify({ offers, display_currency: display });
  });

export const publicSearchHotels = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    city_code: z.string().min(2).max(8).optional(),
    city_name: z.string().min(2).max(80).optional(),
    country_code: z.string().length(2),
    checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(1).max(8),
    children: z.number().int().min(0).max(6).optional(),
    currency: z.string().length(3).optional(),
    display_currency: DisplayCurrencyEnum.optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => {
    const display = data.display_currency || "USD";
    try {
      const res = await liteapiSearch({ ...data, currency: data.currency || "USD" });
      const hotels = await Promise.all(res.hotels.map(async (h) => {
        if (!h.price) return { ...h, price_breakdown: null };
        const price = await publicPrice("hotels", Number(h.price), h.currency || "USD", display);
        return { ...h, base_price: h.price, base_currency: h.currency || "USD", price: price.total, currency: price.currency, price_breakdown: price };
      }));
      return JSON.stringify({ hotels, display_currency: display });
    } catch (err) {
      console.error("Hotel search failed:", err);
      const message = err instanceof Error ? err.message : "Hotel search unavailable";
      return JSON.stringify({ hotels: [], display_currency: display, error: message });
    }
  });

export const publicSearchTours = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    query: z.string().min(2).max(100),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    currency: z.string().length(3).optional(),
    display_currency: DisplayCurrencyEnum.optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => {
    const display = data.display_currency || "USD";
    try {
      const res = await gygSearch(data);
      const tours = await Promise.all(res.tours.map(async (t) => {
        const price = await publicPrice("tours", t.price, t.currency, display);
        // Strip booking_url — guests don't redirect.
        const { booking_url: _omit, ...rest } = t;
        return { ...rest, base_price: t.price, base_currency: t.currency, price: price.total, currency: price.currency, price_breakdown: price };
      }));
      return JSON.stringify({ tours, display_currency: display });
    } catch (err) {
      console.error("Tour search failed:", err);
      const message = err instanceof Error ? err.message : "Tour search unavailable";
      return JSON.stringify({ tours: [], display_currency: display, error: message });
    }
  });

export const publicSearchTransfers = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    pickup_address: z.string().min(3).max(300),
    dropoff_address: z.string().min(3).max(300),
    pickup_datetime: z.string().min(10).max(40),
    num_passengers: z.number().int().min(1).max(20),
    currency: z.string().length(3).optional(),
    display_currency: DisplayCurrencyEnum.optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => {
    const display = data.display_currency || "USD";
    const res = await mozioSearch(data);
    const quotes = await Promise.all(res.quotes.map(async (q) => {
      const price = await publicPrice("transfers", q.total_price, q.currency, display);
      return { ...q, base_price: q.total_price, base_currency: q.currency, total_price: price.total, currency: price.currency, price_breakdown: price };
    }));
    return JSON.stringify({ quotes, display_currency: display });
  });

export const publicSearchInsurance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    nationality: z.string().length(2),
    destination: z.string().length(2),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    travelers: z.array(z.object({ age: z.number().int().min(0).max(120) })).min(1).max(10),
    coverage_type: z.enum(["nomad", "trip", "remote_health"]).optional(),
    display_currency: DisplayCurrencyEnum.optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => {
    const display = data.display_currency || "USD";
    const nat = data.nationality.toUpperCase();
    const dest = data.destination.toUpperCase();
    const destCountry = findCountryByCode(dest);
    const destinationName = destCountry?.name ?? (dest === "WW" ? "Worldwide" : dest);

    const normalized = await getOrScrapeInsurance({
      nationality_iso2: nat,
      destination_iso2: dest,
      destination_name: destinationName,
      start_date: data.start_date,
      end_date: data.end_date,
      travelers: data.travelers,
    });

    const quotes = await Promise.all(normalized.map(async (q) => {
      const price = await publicPrice("insurance", q.price, q.currency, display);
      // Strip the internal underwriter field — never sent to clients.
      const { _internal_underwriter: _u, ...publicQuote } = q;
      return { ...publicQuote, base_price: q.price, base_currency: q.currency, price: price.total, currency: price.currency, price_breakdown: price };
    }));
    return JSON.stringify({ quotes, display_currency: display });
  });

export const publicSearchVisas = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    nationality: z.string().length(2),
    destination: z.string().length(2),
    purpose: z.enum(["tourism", "business", "transit"]).optional(),
    display_currency: DisplayCurrencyEnum.optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => {
    const display = data.display_currency || "USD";
    const res = await sherpaSearch({
      nationality: data.nationality.toUpperCase(),
      destination: data.destination.toUpperCase(),
      purpose: data.purpose,
    });
    const options = await Promise.all(res.options.map(async (v) => {
      const price = await publicPrice("visas", v.price, v.currency, display);
      return { ...v, base_price: v.price, base_currency: v.currency, price: price.total, currency: price.currency, price_breakdown: price };
    }));
    return JSON.stringify({ options, display_currency: display });
  });

// =============================================================
// CHECKOUT — create a pending booking + Stripe PaymentIntent.
// Webhook will promote it on payment_intent.succeeded.
// =============================================================

const ContactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  phone: z.string().min(5).max(30),
});

const GuestCheckoutSchema = z.object({
  vertical: z.enum(["flights", "hotels", "tours", "transfers", "insurance", "visas"]),
  base_amount: z.number().positive().max(1_000_000),  // provider price (pre-markup, in provider currency)
  currency: z.string().length(3),                      // provider currency (e.g. "USD")
  display_currency: DisplayCurrencyEnum.optional(),    // user-chosen settlement currency (defaults to USD)
  contact: ContactSchema,
  // Vertical-specific identifiers / payload — preserved in metadata for webhook fulfillment.
  payload: z.record(z.string(), z.unknown()),
});

export const guestCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GuestCheckoutSchema.parse(d))
  .handler(async ({ data }) => {
    const vertical = data.vertical as Vertical;
    const display = data.display_currency || "USD";
    const price = await publicPrice(vertical, data.base_amount, data.currency, display);
    const reference = genBookingRef();

    // Insert booking row in pending_payment. user_id NULL is not allowed (NOT NULL),
    // so we use a sentinel guest user. We create or fetch the guest profile.
    const guestUserId = await ensureGuestUser(data.contact.email, data.contact.name);

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: guestUserId,
        environment: "live",
        vertical,
        provider: PROVIDER[vertical],
        reference,
        status: "pending_payment",
        fulfillment_mode: FULFILLMENT[vertical],
        customer_name: data.contact.name,
        customer_email: data.contact.email,
        currency: price.currency,
        total_amount: price.total,
        margin_amount: price.travsify_markup,
        metadata: {
          guest: true,
          contact: data.contact,
          payload: data.payload,
          price_breakdown: price,
          provider_currency: data.currency.toUpperCase(),
          provider_amount: data.base_amount,
        } as never,
      })
      .select("id, reference")
      .single();

    if (error || !booking) throw new Error(`Booking insert failed: ${error?.message}`);

    // Create Stripe PaymentIntent. Charge the user in their chosen display currency.
    const intent = await createPaymentIntent({
      amount: Math.round(price.total * 100),
      currency: price.currency,
      description: `Travsify ${vertical} booking ${reference}`,
      customer_email: data.contact.email,
      metadata: {
        kind: "guest_booking",
        booking_reference: reference,
        booking_id: booking.id,
        vertical,
      },
    });

    return {
      reference: booking.reference,
      booking_id: booking.id,
      client_secret: intent.client_secret,
      amount: price.total,
      currency: price.currency,
      price_breakdown: price,
    };
  });

/**
 * Get/create a sentinel guest user row and matching profile so guest bookings
 * have a non-null user_id (the bookings table requires it). Each unique email
 * maps to a single guest record so repeat guests can later claim their bookings.
 */
async function ensureGuestUser(email: string, name: string): Promise<string> {
  const normalised = email.trim().toLowerCase();
  // Try to find an existing auth user.
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  void existing; // we don't filter listUsers — fallback to direct lookup via admin API helper:
  // Use admin API getUserByEmail (not in JS SDK directly) → fall back to a deterministic UUID lookup via profiles.
  const { data: profileMatch } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("full_name", `Guest: ${normalised}`)
    .maybeSingle();
  if (profileMatch?.id) return profileMatch.id;

  // Create a new auth user with a random password — guest cannot sign in unless they reset.
  const randomPw = crypto.randomUUID() + crypto.randomUUID();
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: normalised,
    password: randomPw,
    email_confirm: false,
    user_metadata: { full_name: name, guest: true },
  });
  if (error || !created.user) {
    // Email may already be used by a real account — fall back to looking up by email.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users.find((u) => u.email?.toLowerCase() === normalised);
    if (found) return found.id;
    throw new Error(`Could not provision guest account: ${error?.message ?? "unknown error"}`);
  }

  // Tag the profile so we can recognise guest accounts later.
  await supabaseAdmin
    .from("profiles")
    .update({ full_name: `Guest: ${normalised}` })
    .eq("id", created.user.id);

  return created.user.id;
}
