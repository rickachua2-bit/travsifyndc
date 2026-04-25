import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth as authMiddleware } from "@/integrations/supabase/auth-middleware";
import {
  createCardSetupIntent, persistSetupIntentResult, listUserCards, deleteUserCard,
  fundUsdWalletIntent, fundNgnWallet, ensureVirtualAccount, submitWithdrawal,
} from "@/server/wallet";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { searchFlights as duffelSearch, createOrder as duffelOrder } from "@/server/providers/duffel";
import { searchHotelRates as liteapiSearch, prebookHotel as liteapiPrebook, bookHotel as liteapiBook } from "@/server/providers/liteapi";
import { searchTours as gygSearch } from "@/server/providers/getyourguide";
import { searchTransfers as mozioSearch } from "@/server/providers/mozio";
import { searchInsurance as swSearch } from "@/server/providers/safetywing";
import { searchVisas as sherpaSearch } from "@/server/providers/sherpa";
import { genBookingRef } from "@/server/gateway";

// ---------- Cards ----------
export const startCardLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId, claims } = context as unknown as { userId: string; claims: { email?: string } };
    const email = claims.email || `${userId}@user.travsify.app`;
    return createCardSetupIntent(userId, email);
  });

export const confirmCardLink = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { setup_intent_id: string }) => z.object({ setup_intent_id: z.string().min(5).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    const pm = await persistSetupIntentResult(userId, data.setup_intent_id);
    return { brand: pm.card?.brand, last4: pm.card?.last4 };
  });

export const myCards = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    return listUserCards(userId);
  });

export const removeCard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { card_id: string }) => z.object({ card_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await deleteUserCard(userId, data.card_id);
    return { ok: true };
  });

// ---------- Wallets ----------
export const myWallets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data: wallets } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId);
    return wallets ?? [];
  });

export const myWalletTransactions = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { currency?: "USD" | "NGN"; limit?: number }) => z.object({
    currency: z.enum(["USD", "NGN"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    let q = supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(data.limit ?? 50);
    if (data.currency) q = q.eq("currency", data.currency);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const fundWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    currency: z.enum(["USD", "NGN"]),
    amount: z.number().positive().max(10_000_000),
    payment_method_id: z.string().optional(),
    ngn_method: z.enum(["card", "virtual_account"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as unknown as { userId: string; claims: { email?: string } };
    const email = claims.email || `${userId}@user.travsify.app`;
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name, legal_name, trading_name, company").eq("id", userId).maybeSingle();
    const fullName = normalizeFullName(profile?.full_name, profile?.legal_name, profile?.trading_name, profile?.company, email);

    if (data.currency === "USD") {
      const amountCents = Math.round(data.amount * 100);
      return { kind: "stripe", ...(await fundUsdWalletIntent({ userId, email, amountCents, paymentMethodId: data.payment_method_id, name: fullName })) };
    }
    try {
      return await fundNgnWallet({ userId, email, fullName, amount: data.amount, method: data.ngn_method || "virtual_account" });
    } catch (error) {
      return { ok: false as const, error: virtualAccountUnavailableMessage(error) };
    }
  });

function virtualAccountUnavailableMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "NGN virtual account is unavailable";
  console.warn("NGN virtual account provisioning failed:", message);

  if (/fincra error (401|403)|x-pub-key|ip address is not allowed|FINCRA_(API_KEY|BUSINESS_ID|PUBLIC_KEY)/i.test(message)) {
    return "NGN funding is temporarily unavailable — the payment provider rejected our credentials. Please contact support.";
  }

  return message;
}

export const myVirtualAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId, claims } = context as unknown as { userId: string; claims: { email?: string } };
    const email = claims.email || `${userId}@user.travsify.app`;
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name, legal_name, trading_name, company").eq("id", userId).maybeSingle();
    const fullName = normalizeFullName(profile?.full_name, profile?.legal_name, profile?.trading_name, profile?.company, email);
    try {
      return await ensureVirtualAccount(userId, email, fullName);
    } catch (error) {
      return { ok: false as const, error: virtualAccountUnavailableMessage(error) };
    }
  });

// ---------- Bank accounts & withdrawals ----------
export const myBankAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data } = await supabaseAdmin.from("bank_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const addBankAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    currency: z.enum(["USD", "NGN"]),
    account_name: z.string().min(2).max(120),
    account_number: z.string().min(4).max(40),
    bank_code: z.string().max(20).optional(),
    bank_name: z.string().max(120).optional(),
    swift_code: z.string().max(20).optional(),
    iban: z.string().max(40).optional(),
    routing_number: z.string().max(20).optional(),
    country: z.string().length(2).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data: row, error } = await supabaseAdmin.from("bank_accounts").insert({ ...data, user_id: userId }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBankAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await supabaseAdmin.from("bank_accounts").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    bank_account_id: z.string().uuid(),
    amount: z.number().positive().max(10_000_000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    return submitWithdrawal({ userId, bankAccountId: data.bank_account_id, amount: data.amount });
  });

export const myWithdrawals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data } = await supabaseAdmin.from("withdrawal_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

/** Cancel a still-pending withdrawal and refund the wallet. */
export const cancelWithdrawal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data: w, error } = await supabaseAdmin
      .from("withdrawal_requests").select("*").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (error || !w) throw new Error("Withdrawal not found");
    if (w.status !== "pending") throw new Error(`Cannot cancel withdrawal in status ${w.status}`);

    // Refund the wallet for the full debited amount
    await supabaseAdmin.rpc("wallet_credit", {
      p_user_id: userId,
      p_currency: w.currency,
      p_amount: Number(w.amount),
      p_category: "refund",
      p_reference: `cancel_${w.id}`,
      p_description: "Withdrawal cancelled by user",
      p_provider: w.provider ?? undefined,
      p_provider_reference: undefined,
      p_booking_id: undefined,
      p_metadata: { withdrawal_id: w.id },
    });
    await supabaseAdmin.from("withdrawal_requests").update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    }).eq("id", w.id);
    return { ok: true };
  });

// We return a JSON string from these search endpoints because the supplier shapes are deeply typed
// with `unknown` fields that TanStack Start's serializability check rejects. The client parses it.
export const searchFlightsInternal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    origin: z.string().length(3),
    destination: z.string().length(3),
    departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    adults: z.number().int().min(1).max(8).optional(),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => JSON.stringify(await duffelSearch("live", data)));

export const searchHotelsInternal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    city_code: z.string().min(2).max(8).optional(),
    country_code: z.string().length(2).optional(),
    checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(1).max(8),
    children: z.number().int().min(0).max(6).optional(),
    currency: z.string().length(3).optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => JSON.stringify(await liteapiSearch(data)));

const PassengerSchema = z.object({
  given_name: z.string().min(1).max(60),
  family_name: z.string().min(1).max(60),
  born_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["m", "f"]),
  title: z.enum(["mr", "ms", "mrs", "miss", "dr"]),
  email: z.string().email().max(255),
  phone_number: z.string().min(5).max(30),
});

export const bookFlightFromWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    offer_id: z.string().min(5).max(120),
    amount: z.number().positive().max(10_000_000),
    currency: z.enum(["USD", "NGN"]),
    passengers: z.array(PassengerSchema).min(1).max(9),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    const ref = genBookingRef();

    // Debit wallet first; rollback on order failure
    await supabaseAdmin.rpc("wallet_debit", {
      p_user_id: userId,
      p_currency: data.currency,
      p_amount: data.amount,
      p_category: "booking_payment",
      p_reference: `book_${ref}`,
      p_description: `Flight booking ${ref}`,
      p_provider: "duffel",
      p_provider_reference: undefined,
      p_booking_id: undefined,
      p_metadata: { offer_id: data.offer_id },
    });

    try {
      const order = await duffelOrder("live", {
        offer_id: data.offer_id,
        passengers: data.passengers,
        payment_amount: String(data.amount),
        payment_currency: data.currency,
      });
      const orderData = order.data as Record<string, unknown>;
      const { data: booking } = await supabaseAdmin.from("bookings").insert({
        user_id: userId,
        environment: "live",
        vertical: "flights",
        provider: "duffel",
        reference: ref,
        provider_reference: (orderData.id as string) || null,
        status: "confirmed",
        total_amount: data.amount,
        currency: data.currency,
        customer_email: data.passengers[0].email,
        customer_name: `${data.passengers[0].given_name} ${data.passengers[0].family_name}`,
        metadata: { offer_id: data.offer_id, paid_via: "wallet" },
      }).select("*").single();
      return booking;
    } catch (e) {
      // Refund wallet on failure
      await supabaseAdmin.rpc("wallet_credit", {
        p_user_id: userId,
        p_currency: data.currency,
        p_amount: data.amount,
        p_category: "refund",
        p_reference: `refund_${ref}`,
        p_description: `Flight booking failed: ${(e as Error).message}`,
        p_provider: "duffel",
        p_provider_reference: undefined,
        p_booking_id: undefined,
        p_metadata: { offer_id: data.offer_id },
      });
      throw e;
    }
  });

export const bookHotelFromWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    offer_id: z.string().min(5).max(200),
    amount: z.number().positive().max(10_000_000),
    currency: z.enum(["USD", "NGN"]),
    holder: z.object({
      firstName: z.string().min(1).max(60),
      lastName: z.string().min(1).max(60),
      email: z.string().email().max(255),
    }),
    guests: z.array(z.object({
      firstName: z.string().min(1).max(60),
      lastName: z.string().min(1).max(60),
      email: z.string().email().max(255),
    })).min(1).max(8),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    const ref = genBookingRef();

    await supabaseAdmin.rpc("wallet_debit", {
      p_user_id: userId,
      p_currency: data.currency,
      p_amount: data.amount,
      p_category: "booking_payment",
      p_reference: `book_${ref}`,
      p_description: `Hotel booking ${ref}`,
      p_provider: "liteapi",
      p_provider_reference: undefined,
      p_booking_id: undefined,
      p_metadata: { offer_id: data.offer_id },
    });

    try {
      const pre = await liteapiPrebook(data.offer_id) as { data?: { prebookId?: string } };
      const prebookId = pre.data?.prebookId;
      if (!prebookId) throw new Error("Prebook failed");
      const booked = await liteapiBook({
        prebookId,
        guests: data.guests,
        holder: data.holder,
        payment: { method: "WALLET" },
      }) as { data?: { bookingId?: string } };

      const { data: booking } = await supabaseAdmin.from("bookings").insert({
        user_id: userId,
        environment: "live",
        vertical: "hotels",
        provider: "liteapi",
        reference: ref,
        provider_reference: booked.data?.bookingId || prebookId,
        status: "confirmed",
        total_amount: data.amount,
        currency: data.currency,
        customer_email: data.holder.email,
        customer_name: `${data.holder.firstName} ${data.holder.lastName}`,
        metadata: { offer_id: data.offer_id, paid_via: "wallet" },
      }).select("*").single();
      return booking;
    } catch (e) {
      await supabaseAdmin.rpc("wallet_credit", {
        p_user_id: userId,
        p_currency: data.currency,
        p_amount: data.amount,
        p_category: "refund",
        p_reference: `refund_${ref}`,
        p_description: `Hotel booking failed: ${(e as Error).message}`,
        p_provider: "liteapi",
        p_provider_reference: undefined,
        p_booking_id: undefined,
        p_metadata: { offer_id: data.offer_id },
      });
      throw e;
    }
  });

// ---------- Affiliate verticals (manual fulfillment) ----------
export const searchToursInternal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    query: z.string().min(2).max(100),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    currency: z.string().length(3).optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => JSON.stringify(await gygSearch(data)));

export const searchTransfersInternal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    pickup_address: z.string().min(3).max(300),
    dropoff_address: z.string().min(3).max(300),
    pickup_datetime: z.string().min(10).max(40),
    num_passengers: z.number().int().min(1).max(20),
    currency: z.string().length(3).optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => JSON.stringify(await mozioSearch(data)));

export const searchInsuranceInternal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    nationality: z.string().length(2),
    destination: z.string().length(2),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    travelers: z.array(z.object({ age: z.number().int().min(0).max(120) })).min(1).max(10),
    coverage_type: z.enum(["nomad", "trip", "remote_health"]).optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => JSON.stringify(await swSearch({
    ...data,
    nationality: data.nationality.toUpperCase(),
    destination: data.destination.toUpperCase(),
  })));

export const searchVisasInternal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    nationality: z.string().length(2),
    destination: z.string().length(2),
    purpose: z.enum(["tourism", "business", "transit"]).optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<string> => JSON.stringify(await sherpaSearch({
    nationality: data.nationality.toUpperCase(),
    destination: data.destination.toUpperCase(),
    purpose: data.purpose,
  })));

/** Generic wallet-pay handler for manual-fulfillment verticals (tours, transfers, insurance, visas). */
export const bookManualFromWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    vertical: z.enum(["tours", "transfers", "insurance", "visas"]),
    amount: z.number().positive().max(10_000_000),
    currency: z.enum(["USD", "NGN"]),
    customer: z.object({ name: z.string().min(2).max(120), email: z.string().email().max(255) }),
    payload: z.record(z.string(), z.unknown()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    const ref = genBookingRef();
    const provider = ({ tours: "getyourguide", transfers: "mozio", insurance: "safetywing", visas: "sherpa" } as const)[data.vertical];

    // Create booking row first
    const { data: booking, error } = await supabaseAdmin.from("bookings").insert({
      user_id: userId,
      environment: "live",
      vertical: data.vertical,
      provider,
      reference: ref,
      status: "processing",
      fulfillment_mode: "manual",
      total_amount: data.amount,
      currency: data.currency,
      customer_email: data.customer.email,
      customer_name: data.customer.name,
      metadata: { paid_via: "wallet", payload: data.payload } as never,
    }).select("*").single();
    if (error || !booking) throw new Error(error?.message || "Booking insert failed");

    // Debit wallet (refund booking row on failure)
    try {
      await supabaseAdmin.rpc("wallet_debit", {
        p_user_id: userId,
        p_currency: data.currency,
        p_amount: data.amount,
        p_category: "booking_payment",
        p_reference: `book_${ref}`,
        p_description: `${data.vertical} booking ${ref}`,
        p_provider: provider,
        p_provider_reference: undefined,
        p_booking_id: booking.id,
        p_metadata: {},
      });
    } catch (e) {
      await supabaseAdmin.from("bookings").update({ status: "cancelled", metadata: { paid_via: "wallet", cancel_reason: (e as Error).message } as never }).eq("id", booking.id);
      throw e;
    }
    return booking;
  });
export const myBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data } = await supabaseAdmin.from("bookings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

// ---------- Stripe publishable key (safe to expose) ----------
export const getStripePublishableKey = createServerFn({ method: "GET" })
  .handler(async () => {
    return { key: process.env.STRIPE_PUBLISHABLE_KEY || "" };
  });

// ---------- Admin: withdrawals queue ----------
async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

export const adminListWithdrawals = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["pending", "approved", "processing", "paid", "rejected", "failed"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await assertAdmin(userId);
    let q = supabaseAdmin.from("withdrawal_requests").select("*, bank_accounts(*), profiles!withdrawal_requests_user_id_fkey(full_name, legal_name, company)").order("created_at", { ascending: true }).limit(200);
    if (data.status) q = q.eq("status", data.status);
    // The FK join above may not exist — fall back to manual
    const { data: rows } = await supabaseAdmin.from("withdrawal_requests").select("*").order("created_at", { ascending: true }).limit(200);
    const filtered = (rows ?? []).filter((r) => !data.status || r.status === data.status);
    // Enrich with bank + user
    const userIds = [...new Set(filtered.map((r) => r.user_id))];
    const bankIds = [...new Set(filtered.map((r) => r.bank_account_id))];
    const [profilesRes, banksRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, legal_name, company").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("bank_accounts").select("*").in("id", bankIds.length ? bankIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const bankById = new Map((banksRes.data ?? []).map((b) => [b.id, b]));
    void q;
    return filtered.map((r) => ({
      ...r,
      profile: profileById.get(r.user_id) || null,
      bank: bankById.get(r.bank_account_id) || null,
    }));
  });

export const adminApproveWithdrawal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await assertAdmin(userId);
    const { approveWithdrawal } = await import("@/server/wallet");
    return approveWithdrawal(userId, data.id);
  });

export const adminRejectWithdrawal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), reason: z.string().min(2).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await assertAdmin(userId);
    const { rejectWithdrawal } = await import("@/server/wallet");
    await rejectWithdrawal(userId, data.id, data.reason);
    return { ok: true };
  });

export const adminMarkWithdrawalPaid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), provider_reference: z.string().max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await assertAdmin(userId);
    const { markWithdrawalPaid } = await import("@/server/wallet");
    await markWithdrawalPaid(userId, data.id, data.provider_reference);
    return { ok: true };
  });
