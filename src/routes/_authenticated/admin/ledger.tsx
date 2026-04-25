import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { adminListWalletTxns } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/ledger")({
  component: AdminLedger,
  head: () => ({ meta: [{ title: "Ledger — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Txn = {
  id: string;
  user_id: string;
  currency: string;
  direction: string;
  amount: number;
  balance_after: number;
  category: string;
  reference: string;
  description: string | null;
  provider: string | null;
  provider_reference: string | null;
  booking_id: string | null;
  created_at: string;
  profile: { full_name: string | null; legal_name: string | null; company: string | null } | null;
};

const CURRENCIES = ["all", "USD", "NGN"] as const;
const DIRECTIONS = ["all", "credit", "debit"] as const;
const CATEGORIES = [
  "all",
  "deposit",
  "booking_payment",
  "withdrawal",
  "refund",
  "admin_adjustment",
  "fee",
] as const;

function AdminLedger() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("all");
  const [direction, setDirection] = useState<(typeof DIRECTIONS)[number]>("all");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const res = await adminListWalletTxns({
        data: {
          currency: currency === "all" ? undefined : currency,
          direction: direction === "all" ? undefined : direction,
          category: category === "all" ? undefined : category,
          q: q || undefined,
          limit: 300,
        },
      });
      setRows(res.transactions as Txn[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [currency, direction, category]);

  function exportCsv() {
    const header = ["created_at", "partner", "currency", "direction", "amount", "balance_after", "category", "reference", "provider", "description"].join(",");
    const lines = rows.map((r) => [
      r.created_at,
      `"${(r.profile?.legal_name ?? r.profile?.company ?? r.user_id).replace(/"/g, "'")}"`,
      r.currency,
      r.direction,
      r.amount,
      r.balance_after,
      r.category,
      r.reference,
      r.provider ?? "",
      `"${(r.description ?? "").replace(/"/g, "'")}"`,
    ].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Treasury</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Ledger</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every wallet movement, ever. Filter, search, and export for accounting.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select label="Currency" value={currency} onChange={(v) => setCurrency(v as typeof currency)} options={CURRENCIES} />
        <Select label="Direction" value={direction} onChange={(v) => setDirection(v as typeof direction)} options={DIRECTIONS} />
        <Select label="Category" value={category} onChange={(v) => setCategory(v as typeof category)} options={CATEGORIES} />
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} placeholder="Reference, description, provider ref…" className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm" />
        </div>
        <button onClick={refresh} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Search</button>
        <button onClick={exportCsv} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent">Export CSV</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No transactions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>When</Th><Th>Partner</Th><Th>Cat.</Th><Th>Dir</Th><Th className="text-right">Amount</Th>
                <Th className="text-right">After</Th><Th>Reference</Th><Th>Provider</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                  <Td className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</Td>
                  <Td className="text-xs">{r.profile?.legal_name ?? r.profile?.company ?? r.user_id.slice(0, 8)}</Td>
                  <Td className="text-xs"><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{r.category}</span></Td>
                  <Td>
                    {r.direction === "credit" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><ArrowDownToLine className="h-3 w-3" /> +</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><ArrowUpFromLine className="h-3 w-3" /> −</span>
                    )}
                  </Td>
                  <Td className="text-right font-mono font-semibold">{r.currency} {Number(r.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                  <Td className="text-right font-mono text-xs text-muted-foreground">{Number(r.balance_after).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Td>
                  <Td className="font-mono text-[11px]">{r.reference}</Td>
                  <Td className="text-xs">{r.provider ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-border bg-white px-2 py-1.5 text-xs font-semibold capitalize">
        {options.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
      </select>
    </label>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
