import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createCardSetupIntent, persistSetupIntentResult, listUserCards, deleteUserCard,
  fundUsdWalletIntent, fundNgnWallet, ensureVirtualAccount, submitWithdrawal,
} from "@/server/wallet";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { searchFlights as duffelSearch, createOrder as duffelOrder } from "@/server/providers/duffel";
import { searchHotelRates as liteapiSearch, prebookHotel as liteapiPrebook, bookHotel as liteapiBook } from "@/server/providers/liteapi";
import { genBookingRef } from "@/server/gateway";

// ---------- Cards ----------
export const startCardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context as unknown as { userId: string; claims: { email?: string } };
    const email = claims.email || `${userId}@user.travsify.app`;
    return createCardSetupIntent(userId, email);
  });

export const confirmCardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { setup_intent_id: string }) => z.object({ setup_intent_id: z.string().min(5).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    const pm = await persistSetupIntentResult(userId, data.setup_intent_id);
    return { brand: pm.card?.brand, last4: pm.card?.last4 };
  });

export const myCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    return listUserCards(userId);
  });

export const removeCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { card_id: string }) => z.object({ card_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await deleteUserCard(userId, data.card_id);
    return { ok: true };
  });

// ---------- Wallets ----------
export const myWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data: wallets } = await supabaseAdmin.from("wallets").select("*").eq("user_id", userId);
    return wallets ?? [];
  });

export const myWalletTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    currency: z.enum(["USD", "NGN"]),
    amount: z.number().positive().max(10_000_000),
    payment_method_id: z.string().optional(),
    ngn_method: z.enum(["card", "virtual_account"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as unknown as { userId: string; claims: { email?: string } };
    const email = claims.email || `${userId}@user.travsify.app`;
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name, legal_name").eq("id", userId).maybeSingle();
    const fullName = profile?.legal_name || profile?.full_name || email.split("@")[0];

    if (data.currency === "USD") {
      const amountCents = Math.round(data.amount * 100);
      return { kind: "stripe", ...(await fundUsdWalletIntent({ userId, email, amountCents, paymentMethodId: data.payment_method_id, name: fullName })) };
    }
    return fundNgnWallet({ userId, email, fullName, amount: data.amount, method: data.ngn_method || "virtual_account" });
  });

export const myVirtualAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context as unknown as { userId: string; claims: { email?: string } };
    const email = claims.email || `${userId}@user.travsify.app`;
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name, legal_name").eq("id", userId).maybeSingle();
    const fullName = profile?.legal_name || profile?.full_name || email.split("@")[0];
    return ensureVirtualAccount(userId, email, fullName);
  });

// ---------- Bank accounts & withdrawals ----------
export const myBankAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data } = await supabaseAdmin.from("bank_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const addBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    await supabaseAdmin.from("bank_accounts").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    bank_account_id: z.string().uuid(),
    amount: z.number().positive().max(10_000_000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as { userId: string };
    return submitWithdrawal({ userId, bankAccountId: data.bank_account_id, amount: data.amount });
  });

export const myWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data } = await supabaseAdmin.from("withdrawal_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

// ---------- In-dashboard bookings ----------
export const searchFlightsInternal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    origin: z.string().length(3),
    destination: z.string().length(3),
    departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    adults: z.number().int().min(1).max(8).optional(),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
  }).parse(d))
  .handler(async ({ data }) => (await duffelSearch("live", data)) as unknown as Record<string, unknown>);

export const searchHotelsInternal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    city_code: z.string().min(2).max(8).optional(),
    country_code: z.string().length(2).optional(),
    checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(1).max(8),
    children: z.number().int().min(0).max(6).optional(),
    currency: z.string().length(3).optional(),
  }).parse(d))
  .handler(async ({ data }) => (await liteapiSearch(data)) as unknown as Record<string, unknown>);

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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
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

export const myBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as unknown as { userId: string };
    const { data } = await supabaseAdmin.from("bookings").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });
