import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Wallet as WalletIcon, Plus, Minus, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { adminListWallets, adminAdjustWallet } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/wallets")({
  component: AdminWallets,
  head: () => ({ meta: [{ title: "Wallets — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Wallet = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  updated_at: string;
  profile: { full_name: string | null; legal_name: string | null; company: string | null; kyc_status: string } | null;
};

const CURRENCIES = ["all", "USD", "NGN"] as const;

function AdminWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("all");
  const [q, setQ] = useState("");
  const [adjust, setAdjust] = useState<Wallet | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await adminListWallets({ data: { currency: currency === "all" ? undefined : currency, q } });
      setWallets(res.wallets as Wallet[]);
      setTotals(res.totals);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currency]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Treasury</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Partner wallets</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live balances across every partner. Use the adjust action for refunds, corrections, or goodwill credits.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(totals).map(([cur, total]) => (
          <div key={cur} className="rounded-2xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><WalletIcon className="h-4 w-4" /></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total {cur}</span>
            </div>
            <div className="mt-3 font-display text-2xl font-extrabold text-primary">{cur} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground">Across {wallets.filter((w) => w.currency === cur).length} wallets</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-lg border border-border bg-white p-1">
          {CURRENCIES.map((c) => (
            <button key={c} onClick={() => setCurrency(c)} className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            placeholder="Search partner name or company…"
            className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <button onClick={refresh} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Search</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : wallets.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No wallets found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>Partner</Th><Th>KYC</Th><Th>Currency</Th><Th className="text-right">Balance</Th><Th>Updated</Th><Th className="text-right">Action</Th></tr>
            </thead>
            <tbody>
              {wallets.map((w) => (
                <tr key={w.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                  <Td><span className="font-semibold text-foreground">{w.profile?.legal_name ?? w.profile?.company ?? w.profile?.full_name ?? w.user_id.slice(0, 8)}</span></Td>
                  <Td><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{w.profile?.kyc_status ?? "—"}</span></Td>
                  <Td className="font-semibold">{w.currency}</Td>
                  <Td className="text-right font-mono font-semibold">{Number(w.balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                  <Td className="text-xs text-muted-foreground">{new Date(w.updated_at).toLocaleString()}</Td>
                  <Td className="text-right">
                    <button onClick={() => setAdjust(w)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold hover:border-accent hover:text-accent">
                      Adjust <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adjust && <AdjustModal wallet={adjust} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); refresh(); }} />}
    </main>
  );
}

function AdjustModal({ wallet, onClose, onDone }: { wallet: Wallet; onClose: () => void; onDone: () => void }) {
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Enter a positive amount");
    if (reason.trim().length < 2) return toast.error("Reason is required");
    setSubmitting(true);
    try {
      await adminAdjustWallet({
        data: {
          user_id: wallet.user_id,
          currency: wallet.currency as "USD" | "NGN",
          direction,
          amount: n,
          reason: reason.trim(),
        },
      });
      toast.success(`${direction === "credit" ? "Credited" : "Debited"} ${wallet.currency} ${n}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-extrabold text-primary">Adjust wallet</h2>
        <p className="mt-1 text-xs text-muted-foreground">{wallet.profile?.legal_name ?? wallet.profile?.company} · {wallet.currency} balance: {Number(wallet.balance).toLocaleString()}</p>

        <div className="mt-4 inline-flex gap-1 rounded-lg border border-border bg-surface p-1">
          <button onClick={() => setDirection("credit")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${direction === "credit" ? "bg-success text-white" : "text-muted-foreground"}`}>
            <Plus className="h-3 w-3" /> Credit
          </button>
          <button onClick={() => setDirection("debit")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${direction === "debit" ? "bg-destructive text-white" : "text-muted-foreground"}`}>
            <Minus className="h-3 w-3" /> Debit
          </button>
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount ({wallet.currency})</label>
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" placeholder="0.00" />

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason (logged in audit trail)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" rows={3} placeholder="e.g., Refund for booking BK-12345 (provider failure)" />

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-2 text-xs font-semibold">Cancel</button>
          <button onClick={submit} disabled={submitting} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {submitting ? "Processing…" : `Confirm ${direction}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
