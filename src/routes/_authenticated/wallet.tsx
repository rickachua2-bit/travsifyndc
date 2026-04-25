import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet as WalletIcon, Plus, Building2, ArrowUpRight, Copy, CreditCard,
  Trash2, ArrowDownLeft, Loader2, ExternalLink, AlertCircle, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  myWallets, myWalletTransactions, myBankAccounts, addBankAccount, deleteBankAccount,
  requestWithdrawal, myWithdrawals, fundWallet, myVirtualAccount,
  startCardLink, myCards, removeCard,
} from "@/server/dashboard.functions";
import { StripeProvider } from "@/components/wallet/StripeProvider";
import { CardLinkForm } from "@/components/wallet/CardLinkForm";
import { UsdTopUpForm } from "@/components/wallet/UsdTopUpForm";
import { PartnerShell } from "@/components/partner/PartnerShell";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Wallet — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

type Wallet = { id: string; currency: "USD" | "NGN"; balance: number };
type Txn = { id: string; currency: string; direction: string; amount: number; balance_after: number; category: string; description: string | null; created_at: string };
type Bank = { id: string; currency: string; account_name: string; account_number: string; bank_name: string | null };
type Withdrawal = { id: string; currency: string; amount: number; status: string; created_at: string };
type VAccount = { account_number?: string; account_name?: string; bank_name?: string };
type Card = { id: string; brand: string | null; last4: string | null; exp_month: number | null; exp_year: number | null };

const PRESETS_USD = [50, 100, 250, 500, 1000];
const PRESETS_NGN = [25_000, 50_000, 100_000, 250_000, 500_000];
const MIN_USD = 5;
const MIN_NGN = 5_000;

function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [vacc, setVacc] = useState<VAccount | null>(null);
  const [vaccLoading, setVaccLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardLinkSecret, setCardLinkSecret] = useState<{ client_secret: string; setup_intent_id: string } | null>(null);
  const [topUpSecret, setTopUpSecret] = useState<string | null>(null);

  // Modal state
  const [fundOpen, setFundOpen] = useState<null | "USD" | "NGN">(null);
  const [withdrawTarget, setWithdrawTarget] = useState<Bank | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<Card | null>(null);
  const [confirmDeleteBank, setConfirmDeleteBank] = useState<Bank | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [w, t, b, wd, c] = await Promise.all([
        myWallets(), myWalletTransactions({ data: { limit: 50 } }), myBankAccounts(), myWithdrawals(), myCards(),
      ]);
      setWallets(w as Wallet[]);
      setTxns(t as Txn[]);
      setBanks(b as Bank[]);
      setWithdrawals(wd as Withdrawal[]);
      setCards(c as Card[]);
    } catch (e) {
      toast.error("Couldn't load wallet — " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function loadVA() {
    setVaccLoading(true);
    try { const v = await myVirtualAccount(); setVacc(v as VAccount); }
    catch (e) { toast.error((e as Error).message); }
    finally { setVaccLoading(false); }
  }

  async function linkCard() {
    try {
      const r = await startCardLink();
      setCardLinkSecret({ client_secret: r.client_secret as string, setup_intent_id: r.setup_intent_id });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function handleFund(currency: "USD" | "NGN", amount: number, ngnMethod: "card" | "virtual_account") {
    setBusy(true);
    try {
      if (currency === "USD") {
        const r = await fundWallet({ data: { currency: "USD", amount } }) as { client_secret?: string };
        if (r.client_secret) {
          setTopUpSecret(r.client_secret);
          setFundOpen(null);
        } else {
          toast.error("Could not start payment");
        }
      } else {
        if (ngnMethod === "virtual_account") {
          await loadVA();
          setFundOpen(null);
          toast.success("Virtual account ready below");
        } else {
          const r = await fundWallet({ data: { currency: "NGN", amount, ngn_method: "card" } }) as { link?: string };
          if (r.link) window.location.href = r.link;
          else toast.error("Could not get checkout link");
        }
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function addBank(form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true);
    try {
      await addBankAccount({ data: {
        currency: fd.get("currency") as "USD" | "NGN",
        account_name: String(fd.get("account_name")),
        account_number: String(fd.get("account_number")),
        bank_name: String(fd.get("bank_name")),
        bank_code: String(fd.get("bank_code") || "") || undefined,
      } });
      toast.success("Bank account added");
      form.reset();
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleWithdraw(amount: number) {
    if (!withdrawTarget) return;
    setBusy(true);
    try {
      await requestWithdrawal({ data: { bank_account_id: withdrawTarget.id, amount } });
      toast.success("Withdrawal submitted for review");
      setWithdrawTarget(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleDeleteCard() {
    if (!confirmDeleteCard) return;
    setBusy(true);
    try {
      await removeCard({ data: { card_id: confirmDeleteCard.id } });
      toast.success("Card removed");
      setConfirmDeleteCard(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleDeleteBank() {
    if (!confirmDeleteBank) return;
    setBusy(true);
    try {
      await deleteBankAccount({ data: { id: confirmDeleteBank.id } });
      toast.success("Bank account removed");
      setConfirmDeleteBank(null);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <PartnerShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Treasury</div>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Wallet</h1>
            <p className="mt-1 text-sm text-muted-foreground">Fund, withdraw, and pay for bookings from your USD or NGN balance.</p>
          </div>
          <Link to="/dashboard-book" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-95">
            <Sparkles className="h-4 w-4" /> Book from wallet
          </Link>
        </div>

        {loading ? (
          <div className="mt-12 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(["USD", "NGN"] as const).map((cur) => {
                const w = wallets.find((x) => x.currency === cur);
                const symbol = cur === "USD" ? "$" : "₦";
                return (
                  <div key={cur} className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cur === "USD" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                          <WalletIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="font-display text-base font-bold text-primary">{cur} Wallet</h2>
                          <p className="text-xs text-muted-foreground">Available balance</p>
                        </div>
                      </div>
                      <div className="text-right font-display text-2xl font-extrabold text-primary">
                        {symbol}{Number(w?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => setFundOpen(cur)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
                        <Plus className="h-3 w-3" /> Add funds
                      </button>
                      <a href="#wallet-activity" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
                        Activity <ArrowDownLeft className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {topUpSecret && (
              <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-primary">Confirm USD payment</h3>
                  <button onClick={() => setTopUpSecret(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
                <StripeProvider clientSecret={topUpSecret}>
                  <UsdTopUpForm onDone={() => { setTopUpSecret(null); setTimeout(refresh, 1500); }} />
                </StripeProvider>
              </div>
            )}

            {vacc && (
              <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <h3 className="font-display text-sm font-bold text-primary">Your NGN virtual account</h3>
                <p className="mt-1 text-xs text-muted-foreground">Transfer to this account from any Nigerian bank app — your wallet credits automatically within minutes.</p>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bank</span>
                    <div className="font-semibold text-foreground">{vacc.bank_name}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account number</span>
                    <div className="flex items-center gap-2 font-mono font-semibold text-foreground">
                      {vacc.account_number}
                      <button onClick={() => { navigator.clipboard.writeText(vacc.account_number || ""); toast.success("Copied"); }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account name</span>
                    <div className="font-semibold text-foreground">{vacc.account_name}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Saved cards */}
            <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-primary">Saved cards (USD)</h2>
                  <p className="text-xs text-muted-foreground">Used for one-tap USD wallet top-up.</p>
                </div>
                <button onClick={linkCard} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
                  <CreditCard className="h-3 w-3" /> Link a card
                </button>
              </div>

              {cardLinkSecret && (
                <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-accent">Enter card details</h3>
                    <button onClick={() => setCardLinkSecret(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                  <StripeProvider clientSecret={cardLinkSecret.client_secret}>
                    <CardLinkForm setupIntentId={cardLinkSecret.setup_intent_id} onDone={() => { setCardLinkSecret(null); refresh(); }} />
                  </StripeProvider>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {cards.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-xs text-muted-foreground">No saved cards yet.</p>
                ) : cards.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold capitalize">{c.brand ?? "Card"}</span>
                      <span className="font-mono text-muted-foreground">•••• {c.last4}</span>
                      <span className="text-xs text-muted-foreground">exp {String(c.exp_month).padStart(2, "0")}/{c.exp_year}</span>
                    </div>
                    <button onClick={() => setConfirmDeleteCard(c)} className="rounded-md border border-border bg-white p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h2 className="font-display text-base font-bold text-primary">Bank accounts</h2>
              <p className="text-xs text-muted-foreground">Used for withdrawals. Add at least one before requesting a payout.</p>
              <form onSubmit={(e) => { e.preventDefault(); addBank(e.currentTarget); }} className="mt-4 grid gap-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-5">
                <select name="currency" required className="rounded-md border border-border bg-white px-2 py-2 text-xs">
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                </select>
                <input name="account_name" required placeholder="Account name" className="rounded-md border border-border bg-white px-2 py-2 text-xs" />
                <input name="account_number" required placeholder="Account number" className="rounded-md border border-border bg-white px-2 py-2 text-xs" />
                <input name="bank_name" required placeholder="Bank name" className="rounded-md border border-border bg-white px-2 py-2 text-xs" />
                <div className="flex gap-2">
                  <input name="bank_code" placeholder="Bank code (NGN)" className="flex-1 rounded-md border border-border bg-white px-2 py-2 text-xs" />
                  <button type="submit" disabled={busy} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Add</button>
                </div>
              </form>
              <div className="mt-4 space-y-2">
                {banks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-xs text-muted-foreground">No bank accounts yet.</p>
                ) : banks.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{b.currency}</span>
                      <span className="font-semibold">{b.bank_name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-xs">{b.account_number}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{b.account_name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setWithdrawTarget(b)} className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-accent-foreground hover:opacity-95">
                        <ArrowUpRight className="h-3 w-3" /> Withdraw
                      </button>
                      <button onClick={() => setConfirmDeleteBank(b)} className="rounded-md border border-border bg-white p-1.5 text-muted-foreground hover:border-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h2 className="font-display text-base font-bold text-primary">Withdrawals</h2>
              {withdrawals.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-xs text-muted-foreground">No withdrawal requests yet.</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Status</th></tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="border-t border-border">
                          <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2 font-semibold">{w.currency} {Number(w.amount).toLocaleString()}</td>
                          <td className="px-3 py-2"><WithdrawalStatus status={w.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h2 className="font-display text-base font-bold text-primary">Recent transactions</h2>
              <p className="text-xs text-muted-foreground">Last 50 wallet movements.</p>
              {txns.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-xs text-muted-foreground">No transactions yet.</p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">When</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t) => (
                        <tr key={t.id} className="border-t border-border">
                          <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2 text-xs capitalize">
                            <span className="inline-flex items-center gap-1">
                              {t.direction === "credit" ? <ArrowDownLeft className="h-3 w-3 text-success" /> : <ArrowUpRight className="h-3 w-3 text-destructive" />}
                              {t.category.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">{t.description ?? "—"}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${t.direction === "credit" ? "text-success" : "text-destructive"}`}>
                            {t.direction === "credit" ? "+" : "−"}{t.currency} {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{t.currency} {Number(t.balance_after).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Fund dialog */}
      <FundDialog
        open={fundOpen}
        onOpenChange={(v) => !v && setFundOpen(null)}
        currency={fundOpen}
        busy={busy}
        loadingVA={vaccLoading}
        onConfirm={handleFund}
      />

      {/* Withdraw dialog */}
      <WithdrawDialog
        bank={withdrawTarget}
        wallet={wallets.find((w) => w.currency === withdrawTarget?.currency) ?? null}
        busy={busy}
        onCancel={() => setWithdrawTarget(null)}
        onConfirm={handleWithdraw}
      />

      {/* Confirm delete card */}
      <AlertDialog open={!!confirmDeleteCard} onOpenChange={(v) => !v && setConfirmDeleteCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this card?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteCard ? <>Card {confirmDeleteCard.brand} •••• {confirmDeleteCard.last4} will be removed. You can re-link it anytime.</> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep card</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete bank */}
      <AlertDialog open={!!confirmDeleteBank} onOpenChange={(v) => !v && setConfirmDeleteBank(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this bank account?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteBank ? <>{confirmDeleteBank.bank_name} · {confirmDeleteBank.account_number} ({confirmDeleteBank.account_name}) will be removed. Pending withdrawals to this account are not affected.</> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep account</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBank} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerShell>
  );
}

function FundDialog({
  open, onOpenChange, currency, busy, loadingVA, onConfirm,
}: {
  open: "USD" | "NGN" | null;
  onOpenChange: (v: boolean) => void;
  currency: "USD" | "NGN" | null;
  busy: boolean;
  loadingVA: boolean;
  onConfirm: (currency: "USD" | "NGN", amount: number, ngnMethod: "card" | "virtual_account") => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [ngnMethod, setNgnMethod] = useState<"card" | "virtual_account">("virtual_account");

  useEffect(() => { if (open) { setAmount(""); setNgnMethod("virtual_account"); } }, [open]);

  if (!currency) return null;
  const cur: "USD" | "NGN" = currency;
  const presets = cur === "USD" ? PRESETS_USD : PRESETS_NGN;
  const min = cur === "USD" ? MIN_USD : MIN_NGN;
  const symbol = cur === "USD" ? "$" : "₦";
  const num = Number(amount);
  const valid = Number.isFinite(num) && num >= min;
  const showAmount = cur === "USD" || ngnMethod === "card";

  function submit() {
    if (cur === "NGN" && ngnMethod === "virtual_account") {
      onConfirm(cur, 0, ngnMethod);
      return;
    }
    if (!valid) return;
    onConfirm(cur, num, ngnMethod);
  }

  return (
    <Dialog open={!!open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add funds — {currency}</DialogTitle>
          <DialogDescription>
            {currency === "USD"
              ? "Pay by card. Funds land in your USD wallet immediately after payment."
              : "Choose how to fund your NGN wallet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currency === "NGN" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNgnMethod("virtual_account")}
                className={`rounded-lg border p-3 text-left text-xs ${ngnMethod === "virtual_account" ? "border-accent bg-accent/5" : "border-border bg-white"}`}
              >
                <div className="flex items-center gap-1.5 font-bold text-foreground"><Building2 className="h-3.5 w-3.5" /> Bank transfer</div>
                <div className="mt-1 text-muted-foreground">Get a virtual account to transfer from any Nigerian bank.</div>
              </button>
              <button
                type="button"
                onClick={() => setNgnMethod("card")}
                className={`rounded-lg border p-3 text-left text-xs ${ngnMethod === "card" ? "border-accent bg-accent/5" : "border-border bg-white"}`}
              >
                <div className="flex items-center gap-1.5 font-bold text-foreground"><CreditCard className="h-3.5 w-3.5" /> Card / USSD</div>
                <div className="mt-1 text-muted-foreground">Pay with debit card via Fincra hosted checkout.</div>
              </button>
            </div>
          )}

          {showAmount && (
            <>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount ({currency})</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-sm font-bold text-muted-foreground">{symbol}</div>
                  <input
                    type="number"
                    step="0.01"
                    min={min}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(min)}
                    className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Minimum {symbol}{min.toLocaleString()}.</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button key={p} type="button" onClick={() => setAmount(String(p))} className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-semibold hover:border-accent hover:text-accent">
                    {symbol}{p.toLocaleString()}
                  </button>
                ))}
              </div>
            </>
          )}

          {currency === "NGN" && ngnMethod === "virtual_account" && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-foreground">
              We'll show your dedicated virtual account number. Transfer any amount to it from any Nigerian bank — your wallet credits within minutes.
            </div>
          )}
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} disabled={busy} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || loadingVA || (showAmount && !valid)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {(busy || loadingVA) ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {currency === "NGN" && ngnMethod === "virtual_account" ? "Show account details" : "Continue to payment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({
  bank, wallet, busy, onCancel, onConfirm,
}: {
  bank: Bank | null;
  wallet: Wallet | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  useEffect(() => { if (bank) setAmount(""); }, [bank]);

  if (!bank) return null;
  const balance = Number(wallet?.balance ?? 0);
  const num = Number(amount);
  const fee = bank.currency === "NGN" ? 100 : 2;
  const net = Math.max(0, num - fee);
  const insufficient = num > balance;
  const valid = Number.isFinite(num) && num > fee && !insufficient;

  return (
    <Dialog open={!!bank} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw to {bank.bank_name}</DialogTitle>
          <DialogDescription>
            {bank.account_number} · {bank.account_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
            <span className="text-muted-foreground">Available balance · </span>
            <span className="font-bold">{bank.currency} {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount to withdraw ({bank.currency})</label>
            <input
              type="number"
              step="0.01"
              min={fee + 1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              autoFocus
            />
            {insufficient && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> Insufficient balance
              </p>
            )}
          </div>

          {valid && (
            <div className="space-y-1 rounded-lg border border-border bg-surface p-3 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Withdrawal amount</span><span className="font-semibold">{bank.currency} {num.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Processing fee</span><span className="font-semibold">{bank.currency} {fee.toLocaleString()}</span></div>
              <div className="mt-1 flex justify-between border-t border-border pt-1 font-bold"><span>Net to bank</span><span>{bank.currency} {net.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">Withdrawals require admin approval before payout (typically within 1 business day).</p>
        </div>

        <DialogFooter>
          <button onClick={onCancel} disabled={busy} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Cancel</button>
          <button onClick={() => onConfirm(num)} disabled={busy || !valid} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Submit withdrawal
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-accent/15 text-accent",
    approved: "bg-blue-500/15 text-blue-600",
    paid: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}
