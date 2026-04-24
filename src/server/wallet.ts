// Server-only helpers for wallet, card, and withdrawal flows.
// SECURITY: only called from server functions / server routes — uses service role.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createCustomer, createSetupIntent, listPaymentMethods, retrievePaymentMethod, detachPaymentMethod, createPaymentIntent } from "@/server/providers/stripe";
import { createVirtualAccount, createNgnCharge, createPayout } from "@/server/providers/fincra";

export function genTxnRef(prefix = "txn"): string {
  return `${prefix}_` + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Gets or lazily creates a Stripe Customer for the user. */
export async function ensureStripeCustomer(userId: string, email: string, name?: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const cust = await createCustomer({ email, name, metadata: { user_id: userId } });
  await supabaseAdmin.from("stripe_customers").insert({ user_id: userId, stripe_customer_id: cust.id });
  return cust.id;
}

/** Creates a SetupIntent so the user can save a card via Stripe Elements. */
export async function createCardSetupIntent(userId: string, email: string, name?: string) {
  const customerId = await ensureStripeCustomer(userId, email, name);
  const si = await createSetupIntent({ customer: customerId, metadata: { user_id: userId } });
  return { client_secret: si.client_secret, setup_intent_id: si.id, customer_id: customerId };
}

/** After a SetupIntent succeeds on the client, persist the resulting payment method. */
export async function persistSetupIntentResult(userId: string, setupIntentId: string) {
  const { retrieveSetupIntent } = await import("@/server/providers/stripe");
  const si = await retrieveSetupIntent(setupIntentId);
  if (si.status !== "succeeded" || !si.payment_method) {
    throw new Error(`SetupIntent not succeeded (status: ${si.status})`);
  }
  const pm = await retrievePaymentMethod(si.payment_method);
  await supabaseAdmin.from("saved_cards").upsert(
    {
      user_id: userId,
      provider: "stripe",
      provider_payment_method_id: pm.id,
      brand: pm.card?.brand ?? null,
      last4: pm.card?.last4 ?? null,
      exp_month: pm.card?.exp_month ?? null,
      exp_year: pm.card?.exp_year ?? null,
    },
    { onConflict: "user_id,provider_payment_method_id" },
  );
  return pm;
}

export async function listUserCards(userId: string) {
  const { data } = await supabaseAdmin
    .from("saved_cards")
    .select("id, provider_payment_method_id, brand, last4, exp_month, exp_year, is_default, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function deleteUserCard(userId: string, cardId: string) {
  const { data: card } = await supabaseAdmin
    .from("saved_cards")
    .select("provider_payment_method_id")
    .eq("id", cardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!card) throw new Error("Card not found");
  try { await detachPaymentMethod(card.provider_payment_method_id); } catch { /* already detached is fine */ }
  await supabaseAdmin.from("saved_cards").delete().eq("id", cardId).eq("user_id", userId);
}

/** Fund USD wallet via Stripe — returns a PaymentIntent the client confirms. */
export async function fundUsdWalletIntent(input: {
  userId: string;
  email: string;
  amountCents: number;
  paymentMethodId?: string;
  name?: string;
}) {
  const customerId = await ensureStripeCustomer(input.userId, input.email, input.name);
  const reference = genTxnRef("fund");
  const intent = await createPaymentIntent({
    amount: input.amountCents,
    currency: "usd",
    description: "Travsify USD wallet funding",
    customer_id: customerId,
    payment_method: input.paymentMethodId,
    customer_email: input.email,
    metadata: {
      user_id: input.userId,
      kind: "wallet_funding",
      currency: "USD",
      reference,
    },
  });
  return { client_secret: intent.client_secret, payment_intent_id: intent.id, reference };
}

/** Fund NGN wallet via Fincra — returns either a hosted checkout link or virtual-account details. */
export async function fundNgnWallet(input: {
  userId: string;
  email: string;
  fullName: string;
  amount: number;
  method: "card" | "virtual_account";
  redirect_url?: string;
}) {
  if (input.method === "virtual_account") {
    return ensureVirtualAccount(input.userId, input.email, input.fullName);
  }
  const reference = genTxnRef("fund");
  const charge = await createNgnCharge({
    amount: input.amount,
    email: input.email,
    reference,
    customer_name: input.fullName,
    redirect_url: input.redirect_url || "https://travsifyndc.lovable.app/dashboard",
  });
  return { kind: "checkout" as const, link: charge.data?.link, reference };
}

export async function ensureVirtualAccount(userId: string, email: string, fullName: string) {
  const { data: existing } = await supabaseAdmin
    .from("fincra_virtual_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return { kind: "virtual_account" as const, ...existing };

  const [first, ...rest] = fullName.split(" ");
  const va = await createVirtualAccount({
    user_id: userId,
    email,
    first_name: first || fullName,
    last_name: rest.join(" ") || first || "User",
  });
  const info = va.data?.accountInformation;
  if (!info?.accountNumber) throw new Error("Fincra did not return account information");
  await supabaseAdmin.from("fincra_virtual_accounts").insert({
    user_id: userId,
    account_number: info.accountNumber,
    account_name: info.accountName || fullName,
    bank_name: info.bankName || "Fincra Partner Bank",
    bank_code: info.bankCode || null,
    provider_reference: va.data?.reference || va.data?._id || `vacc_${userId}`,
    currency: "NGN",
  });
  return {
    kind: "virtual_account" as const,
    account_number: info.accountNumber,
    account_name: info.accountName || fullName,
    bank_name: info.bankName || "Fincra Partner Bank",
  };
}

/** Submit a withdrawal request — debits wallet immediately into a pending request. */
export async function submitWithdrawal(input: {
  userId: string;
  bankAccountId: string;
  amount: number;
}) {
  const { data: bank, error: bankErr } = await supabaseAdmin
    .from("bank_accounts").select("*").eq("id", input.bankAccountId).eq("user_id", input.userId).maybeSingle();
  if (bankErr || !bank) throw new Error("Bank account not found");

  const fee = bank.currency === "NGN" ? 100 : 2; // flat NGN ₦100 / USD $2 placeholder
  const net = Number(input.amount) - fee;
  if (net <= 0) throw new Error("Amount too small after fee");

  const { data: wallet } = await supabaseAdmin
    .from("wallets").select("*").eq("user_id", input.userId).eq("currency", bank.currency).maybeSingle();
  if (!wallet) throw new Error("Wallet not found");
  if (Number(wallet.balance) < input.amount) throw new Error("Insufficient balance");

  const reference = genTxnRef("wd");
  // Debit wallet via the SECURITY DEFINER RPC
  await supabaseAdmin.rpc("wallet_debit", {
    p_user_id: input.userId,
    p_currency: bank.currency,
    p_amount: input.amount,
    p_category: "withdrawal",
    p_reference: reference,
    p_description: `Withdrawal to ${bank.bank_name || bank.account_number}`,
    p_provider: bank.currency === "NGN" ? "fincra" : "manual",
    p_provider_reference: null,
    p_booking_id: null,
    p_metadata: { bank_account_id: bank.id },
  });

  const provider: "fincra" | "manual" = bank.currency === "NGN" ? "fincra" : "manual";
  const { data: req, error: reqErr } = await supabaseAdmin.from("withdrawal_requests").insert({
    user_id: input.userId,
    wallet_id: wallet.id,
    bank_account_id: bank.id,
    currency: bank.currency,
    amount: input.amount,
    fee,
    net_amount: net,
    status: "pending",
    provider,
  }).select("*").single();
  if (reqErr) throw reqErr;
  return req;
}

/** Admin: approve a withdrawal. NGN goes to Fincra payout immediately; USD remains 'approved' for manual transfer. */
export async function approveWithdrawal(adminId: string, withdrawalId: string) {
  const { data: w, error } = await supabaseAdmin
    .from("withdrawal_requests").select("*").eq("id", withdrawalId).maybeSingle();
  if (error || !w) throw new Error("Withdrawal not found");
  if (w.status !== "pending") throw new Error(`Cannot approve withdrawal in status ${w.status}`);

  const { data: bank } = await supabaseAdmin.from("bank_accounts").select("*").eq("id", w.bank_account_id).maybeSingle();
  if (!bank) throw new Error("Bank account missing");

  if (w.currency === "NGN") {
    const ref = `wd_${w.id}`;
    const result = await createPayout({
      amount: Number(w.net_amount),
      currency: "NGN",
      beneficiary_name: bank.account_name,
      beneficiary_account: bank.account_number,
      beneficiary_bank_code: bank.bank_code || undefined,
      reference: ref,
      description: "Travsify wallet withdrawal",
    });
    await supabaseAdmin.from("withdrawal_requests").update({
      status: "processing",
      provider_reference: result.data?.reference || result.data?.id || ref,
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    }).eq("id", w.id);
  } else {
    // USD: mark approved; admin completes off-platform and clicks 'mark paid' later
    await supabaseAdmin.from("withdrawal_requests").update({
      status: "approved",
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    }).eq("id", w.id);
  }
  return { ok: true };
}

/** Admin: mark a USD withdrawal as paid after manual transfer. */
export async function markWithdrawalPaid(adminId: string, withdrawalId: string, providerReference?: string) {
  await supabaseAdmin.from("withdrawal_requests").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    provider_reference: providerReference || null,
    approved_by: adminId,
  }).eq("id", withdrawalId);
}

/** Admin: reject a pending withdrawal — refunds the wallet. */
export async function rejectWithdrawal(adminId: string, withdrawalId: string, reason: string) {
  const { data: w } = await supabaseAdmin
    .from("withdrawal_requests").select("*").eq("id", withdrawalId).maybeSingle();
  if (!w || w.status !== "pending") throw new Error("Cannot reject");

  await supabaseAdmin.rpc("wallet_credit", {
    p_user_id: w.user_id,
    p_currency: w.currency,
    p_amount: w.amount,
    p_category: "refund",
    p_reference: `refund_${w.id}`,
    p_description: `Withdrawal rejected: ${reason}`,
    p_provider: w.provider,
    p_provider_reference: null,
    p_booking_id: null,
    p_metadata: { withdrawal_id: w.id },
  });
  await supabaseAdmin.from("withdrawal_requests").update({
    status: "rejected",
    rejection_reason: reason,
    approved_by: adminId,
    approved_at: new Date().toISOString(),
  }).eq("id", withdrawalId);
}

// Re-export for convenience
export { listPaymentMethods };
