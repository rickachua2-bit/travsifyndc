import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Wallet as WalletIcon, Plus, Building2, ArrowUpRight, Copy } from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { toast } from "sonner";
import {
  myWallets, myWalletTransactions, myBankAccounts, addBankAccount, deleteBankAccount,
  requestWithdrawal, myWithdrawals, fundWallet, myVirtualAccount,
} from "@/server/dashboard.functions";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
  head: () => ({ meta: [{ title: "Wallet — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

type Wallet = { id: string; currency: "USD" | "NGN"; balance: number };
type Txn = { id: string; currency: string; direction: string; amount: number; balance_after: number; category: string; description: string | null; created_at: string };
type Bank = { id: string; currency: string; account_name: string; account_number: string; bank_name: string | null };
type Withdrawal = { id: string; currency: string; amount: number; status: string; created_at: string };
type VAccount = { account_number?: string; account_name?: string; bank_name?: string };

function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [vacc, setVacc] = useState<VAccount | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [w, t, b, wd] = await Promise.all([myWallets(), myWalletTransactions({ data: { limit: 50 } }), myBankAccounts(), myWithdrawals()]);
    setWallets(w as Wallet[]);
    setTxns(t as Txn[]);
    setBanks(b as Bank[]);
    setWithdrawals(wd as Withdrawal[]);
    setLoading(false);
  }
  useEffect(() => { refresh().catch(() => setLoading(false)); }, []);

  async function loadVA() {
    try { const v = await myVirtualAccount(); setVacc(v as VAccount); } catch (e) { toast.error((e as Error).message); }
  }

  async function fund(currency: "USD" | "NGN") {
    const raw = window.prompt(`Amount to fund (${currency})`);
    if (!raw) return;
    const amount = parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Invalid amount");
    try {
      if (currency === "USD") {
        const r = await fundWallet({ data: { currency: "USD", amount } }) as { client_secret?: string };
        toast.success("Funding intent created. Connect Stripe Elements to confirm payment.");
        if (r.client_secret) navigator.clipboard.writeText(r.client_secret);
      } else {
        const r = await fundWallet({ data: { currency: "NGN", amount, ngn_method: "card" } }) as { link?: string };
        if (r.link) window.location.href = r.link; else toast.error("No checkout link returned");
      }
    } catch (e) { toast.error((e as Error).message); }
  }

  async function addBank(form: HTMLFormElement) {
    const fd = new FormData(form);
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
  }

  async function withdraw(bank_account_id: string) {
    const raw = window.prompt("Amount to withdraw");
    if (!raw) return;
    const amount = parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Invalid amount");
    try { await requestWithdrawal({ data: { bank_account_id, amount } }); toast.success("Withdrawal submitted"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/"><Logo /></Link>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="font-display text-3xl font-extrabold text-primary">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fund, withdraw, and pay for bookings from your USD or NGN balance.</p>

        {loading ? <p className="mt-8 text-sm text-muted-foreground">Loading…</p> : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(["USD", "NGN"] as const).map((cur) => {
                const w = wallets.find((x) => x.currency === cur);
                return (
                  <div key={cur} className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><WalletIcon className="h-5 w-5" /></div>
                        <div>
                          <h2 className="font-display text-base font-bold text-primary">{cur} Wallet</h2>
                          <p className="text-xs text-muted-foreground">Current balance</p>
                        </div>
                      </div>
                      <div className="text-right font-display text-2xl font-extrabold text-primary">{cur} {Number(w?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => fund(cur)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
                        <Plus className="h-3 w-3" /> Fund
                      </button>
                      {cur === "NGN" && (
                        <button onClick={loadVA} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
                          <Building2 className="h-3 w-3" /> Bank transfer (virtual account)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {vacc && (
              <div className="mt-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
                <h3 className="font-display text-sm font-bold text-primary">Your NGN virtual account</h3>
                <p className="mt-1 text-xs text-muted-foreground">Transfer to this account from any Nigerian bank app — your wallet credits automatically.</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div><span className="text-xs text-muted-foreground">Bank</span><div className="font-semibold">{vacc.bank_name}</div></div>
                  <div><span className="text-xs text-muted-foreground">Account number</span>
                    <div className="flex items-center gap-2 font-mono font-semibold">
                      {vacc.account_number}
                      <button onClick={() => { navigator.clipboard.writeText(vacc.account_number || ""); toast.success("Copied"); }}><Copy className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div><span className="text-xs text-muted-foreground">Account name</span><div className="font-semibold">{vacc.account_name}</div></div>
                </div>
              </div>
            )}

            <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h2 className="font-display text-base font-bold text-primary">Bank accounts</h2>
              <p className="text-xs text-muted-foreground">Used for withdrawals.</p>
              <form onSubmit={(e) => { e.preventDefault(); addBank(e.currentTarget); }} className="mt-4 grid gap-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-5">
                <select name="currency" required className="rounded-md border border-border bg-white px-2 py-1.5 text-xs"><option value="NGN">NGN</option><option value="USD">USD</option></select>
                <input name="account_name" required placeholder="Account name" className="rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
                <input name="account_number" required placeholder="Account number" className="rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
                <input name="bank_name" required placeholder="Bank name" className="rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
                <div className="flex gap-2">
                  <input name="bank_code" placeholder="Bank code (NGN)" className="flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
                  <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Add</button>
                </div>
              </form>
              <div className="mt-4 space-y-2">
                {banks.length === 0 ? <p className="text-xs text-muted-foreground">No bank accounts yet.</p> : banks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
                    <div><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">{b.currency}</span> <span className="ml-2 font-semibold">{b.bank_name}</span> · <span className="font-mono">{b.account_number}</span> · <span className="text-muted-foreground">{b.account_name}</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => withdraw(b.id)} className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground"><ArrowUpRight className="h-3 w-3" /> Withdraw</button>
                      <button onClick={async () => { await deleteBankAccount({ data: { id: b.id } }); refresh(); }} className="rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-semibold">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h2 className="font-display text-base font-bold text-primary">Withdrawals</h2>
              {withdrawals.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">No withdrawals yet.</p> : (
                <table className="mt-3 w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                  <tbody>{withdrawals.map((w) => (<tr key={w.id} className="border-t border-border"><td className="px-3 py-2 text-xs">{new Date(w.created_at).toLocaleString()}</td><td className="px-3 py-2 font-semibold">{w.currency} {Number(w.amount).toLocaleString()}</td><td className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{w.status}</span></td></tr>))}</tbody>
                </table>
              )}
            </section>

            <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h2 className="font-display text-base font-bold text-primary">Recent transactions</h2>
              {txns.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">No transactions yet.</p> : (
                <table className="mt-3 w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-2 text-left">When</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
                  <tbody>{txns.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs capitalize">{t.category.replace("_", " ")}</td>
                      <td className="px-3 py-2 text-xs">{t.description ?? "—"}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${t.direction === "credit" ? "text-success" : "text-destructive"}`}>{t.direction === "credit" ? "+" : "−"}{t.currency} {Number(t.amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{t.currency} {Number(t.balance_after).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
