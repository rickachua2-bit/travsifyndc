import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, Receipt } from "lucide-react";
import { adminListAllBookings } from "@/server/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: AdminBookingsPage,
  head: () => ({ meta: [{ title: "All bookings — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string; reference: string; vertical: string; provider: string;
  customer_name: string | null; customer_email: string | null;
  total_amount: number; margin_amount: number; currency: string;
  status: string; environment: string; created_at: string;
  fulfillment_mode: string; provider_reference: string | null;
};

const STATUSES = ["all", "pending", "processing", "confirmed", "cancelled", "failed"] as const;
const VERTICALS = ["all", "flights", "hotels", "transfers", "tours", "visas", "insurance", "car_rentals"] as const;

function AdminBookingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [vertical, setVertical] = useState<(typeof VERTICALS)[number]>("all");
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const res = await adminListAllBookings({ data: { status, vertical, q: q.trim() || undefined } });
      setRows(res.bookings as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, vertical]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Platform</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">All bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every booking made through Travsify, across all partners and verticals.</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); refresh(); }}
          className="relative w-full sm:w-80"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Reference, customer, provider ref…"
            className="w-full rounded-md border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </form>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <FilterRow label="Status" value={status} options={STATUSES} onChange={(v) => setStatus(v as typeof status)} />
        <FilterRow label="Vertical" value={vertical} options={VERTICALS} onChange={(v) => setVertical(v as typeof vertical)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Receipt className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-foreground">No bookings match these filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th>Reference</Th>
                  <Th>Vertical</Th>
                  <Th>Customer</Th>
                  <Th>Total</Th>
                  <Th>Margin</Th>
                  <Th>Status</Th>
                  <Th>Env</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                    <Td>
                      <div className="font-mono text-xs font-semibold text-foreground">{r.reference}</div>
                      <div className="text-[11px] text-muted-foreground">{r.provider}{r.provider_reference ? ` • ${r.provider_reference}` : ""}</div>
                    </Td>
                    <Td><span className="capitalize">{r.vertical.replace("_", " ")}</span></Td>
                    <Td>
                      <div className="font-semibold">{r.customer_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{r.customer_email || ""}</div>
                    </Td>
                    <Td className="font-semibold">{r.currency} {Number(r.total_amount).toFixed(2)}</Td>
                    <Td className="text-success">+{Number(r.margin_amount).toFixed(2)}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${r.environment === "live" ? "text-success" : "text-muted-foreground"}`}>
                        {r.environment}
                      </span>
                    </Td>
                    <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function FilterRow({
  label, value, options, onChange,
}: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              value === o
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-white text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.replace("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    confirmed: "bg-success/10 text-success border-success/30",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
    processing: "bg-accent/10 text-accent border-accent/30",
    pending: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${tones[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
