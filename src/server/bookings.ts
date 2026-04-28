// Booking core — shared by every vertical (direct + affiliate).
// SECURITY: server-only. Uses service role.
//
// Responsibilities:
//   1. Compose the customer-facing price = provider_base + travsify_markup + partner_markup
//      (calls the SQL `compose_price` SECURITY DEFINER function).
//   2. Atomically debit the partner's wallet in the booking currency.
//      → enforces the "wallet funding mandatory for all bookings" rule.
//   3. Insert the booking row with markup breakdown in metadata.
//   4. Refund the wallet automatically if the downstream supplier call fails.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AuthedKey } from "@/server/gateway";
import { genBookingRef } from "@/server/gateway";

export type Vertical = "flights" | "hotels" | "transfers" | "tours" | "visas" | "insurance" | "car_rentals";

export type PriceBreakdown = {
  provider_base: number;
  travsify_markup: number;
  partner_markup: number;
  total: number;
  currency: string;
};

/** Compute final price (provider base + Travsify markup + partner markup) for a partner, vertical, currency. */
export async function composePrice(input: {
  partnerId: string;
  vertical: Vertical;
  providerBase: number;
  currency: string;
}): Promise<PriceBreakdown> {
  const { data, error } = await supabaseAdmin.rpc("compose_price", {
    p_partner_id: input.partnerId,
    p_vertical: input.vertical,
    p_provider_base: input.providerBase,
    p_currency: input.currency.toUpperCase(),
  });
  if (error) throw new Error(`Price composition failed: ${error.message}`);
  const breakdown = data as PriceBreakdown;
  return {
    provider_base: Number(breakdown.provider_base),
    travsify_markup: Number(breakdown.travsify_markup),
    partner_markup: Number(breakdown.partner_markup),
    total: Number(breakdown.total),
    currency: breakdown.currency,
  };
}

/** Debit the partner wallet for a booking. Throws on insufficient funds. */
export async function debitWallet(input: {
  userId: string;
  currency: string;
  amount: number;
  reference: string;
  description: string;
  bookingId?: string;
}) {
  const { error } = await supabaseAdmin.rpc("wallet_debit", {
    p_user_id: input.userId,
    p_currency: input.currency.toUpperCase(),
    p_amount: input.amount,
    p_category: "booking",
    p_reference: input.reference,
    p_description: input.description,
    p_provider: undefined,
    p_provider_reference: undefined,
    p_booking_id: input.bookingId,
    p_metadata: {},
  });
  if (error) {
    if (/insufficient/i.test(error.message)) {
      throw new InsufficientFundsError(input.currency, input.amount);
    }
    throw new Error(`Wallet debit failed: ${error.message}`);
  }
}

/** Refund a wallet — used to roll back a booking that the supplier rejected after debit. */
export async function refundWallet(input: {
  userId: string;
  currency: string;
  amount: number;
  reference: string;
  bookingId?: string;
  reason: string;
}) {
  await supabaseAdmin.rpc("wallet_credit", {
    p_user_id: input.userId,
    p_currency: input.currency.toUpperCase(),
    p_amount: input.amount,
    p_category: "refund",
    p_reference: input.reference,
    p_description: input.reason,
    p_provider: undefined,
    p_provider_reference: undefined,
    p_booking_id: input.bookingId,
    p_metadata: {},
  });
}

export class InsufficientFundsError extends Error {
  currency: string;
  amount: number;
  constructor(currency: string, amount: number) {
    super(`Insufficient ${currency} wallet balance to cover ${amount}. Top up at /wallet.`);
    this.currency = currency;
    this.amount = amount;
  }
}

export type CreateBookingInput = {
  key: AuthedKey;
  vertical: Vertical;
  provider: string;
  fulfillmentMode: "auto" | "manual";
  providerBase: number;
  currency: string;
  customer: { name: string; email: string };
  metadata: Record<string, unknown>;
};

export type CreatedBooking = {
  bookingId: string;
  reference: string;
  price: PriceBreakdown;
};

/**
 * Create a booking row in `processing` status, debit the wallet for the composed price.
 * For auto verticals: caller then makes the supplier call and either confirms or refunds via finalizeBooking.
 * For manual verticals: caller leaves it in `processing` for ops to fulfill.
 */
export async function createBookingAndDebit(input: CreateBookingInput): Promise<CreatedBooking> {
  const price = await composePrice({
    partnerId: input.key.userId,
    vertical: input.vertical,
    providerBase: input.providerBase,
    currency: input.currency,
  });

  const reference = genBookingRef();
  const { data: booking, error: insertErr } = await supabaseAdmin
    .from("bookings")
    .insert({
      user_id: input.key.userId,
      api_key_id: input.key.apiKeyId,
      environment: input.key.environment,
      vertical: input.vertical,
      provider: input.provider,
      reference,
      status: "processing",
      fulfillment_mode: input.fulfillmentMode,
      customer_name: input.customer.name,
      customer_email: input.customer.email,
      currency: input.currency.toUpperCase(),
      total_amount: price.total,
      margin_amount: price.travsify_markup + price.partner_markup,
      metadata: {
        ...input.metadata,
        price_breakdown: price,
      } as never,
    })
    .select("id")
    .single();
  if (insertErr || !booking) throw new Error(`Booking insert failed: ${insertErr?.message}`);

  try {
    await debitWallet({
      userId: input.key.userId,
      currency: input.currency,
      amount: price.total,
      reference: `book_${reference}`,
      description: `${input.vertical} booking ${reference}`,
      bookingId: booking.id,
    });
  } catch (e) {
    // Roll back the booking row so we don't leave an orphan.
    await supabaseAdmin.from("bookings").update({ status: "cancelled", metadata: { ...input.metadata, price_breakdown: price, cancel_reason: (e as Error).message } as never }).eq("id", booking.id);
    throw e;
  }

  return { bookingId: booking.id, reference, price };
}

/** Mark a booking confirmed (auto verticals after a successful supplier call). */
export async function confirmBooking(bookingId: string, providerReference: string, extraMetadata: Record<string, unknown> = {}) {
  // Fetch existing metadata so we can merge.
  const { data: existing } = await supabaseAdmin.from("bookings").select("metadata").eq("id", bookingId).maybeSingle();
  const merged = { ...((existing?.metadata as Record<string, unknown>) ?? {}), ...extraMetadata };
  await supabaseAdmin
    .from("bookings")
    .update({ status: "confirmed", provider_reference: providerReference, metadata: merged as never })
    .eq("id", bookingId);
}

/** Failure path for auto verticals: supplier rejected the booking after we debited the wallet. */
export async function failAndRefundBooking(input: {
  bookingId: string;
  reference: string;
  userId: string;
  currency: string;
  amount: number;
  reason: string;
}) {
  await refundWallet({
    userId: input.userId,
    currency: input.currency,
    amount: input.amount,
    reference: `refund_${input.reference}`,
    bookingId: input.bookingId,
    reason: input.reason,
  });
  await supabaseAdmin
    .from("bookings")
    .update({ status: "failed", metadata: { failure_reason: input.reason } as never })
    .eq("id", input.bookingId);
}
