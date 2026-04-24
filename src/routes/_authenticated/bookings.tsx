import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plane, Hotel, Inbox, Search } from "lucide-react";
import { myBookings } from "@/server/dashboard.functions";
import { PartnerShell } from "@/components/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
  head: () => ({ meta: [{ title: "Bookings — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

type Booking = {
  id: string; reference: string; vertical: string; provider: string;
  customer_name: string | null; customer_email: string | null;
  total_amount: number; currency: string; status: string;
  provider_reference: string | null; created_at: string;
};

function BookingsPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "flights" | "hotels" | "transfers" | "tours" | "visas" | "insurance">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "processing" | "failed" | "cancelled">("all");

  useEffect(() => { myBookings().then((r) => { setRows(r as Booking[]); setLoading(false); }); }, []);

  const filtered = rows.filter((r) =>
    (filter === "all" || r.vertical === filter) &&
    (statusFilter === "all" || r.status === statusFilter)
  );

  return (
    <PartnerShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-primary">Bookings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every booking placed via the API or in-app, across all verticals.</p>
          </div>
          <Link to="/book" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
            <Search className="h-4 w-4" /> Book new
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap rounded-lg border border-border bg-white p-1">
            {(["all", "flights", "hotels", "transfers", "tours", "visas", "insurance"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-border bg-white p-1">
            {(["all", "confirmed", "processing", "failed", "cancelled"] as const).map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${statusFilter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
          {loading ? (
            <p className="p-8 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-foreground">No bookings match these filters</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different vertical or status, or place a new booking.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 capitalize">{b.vertical === "flights" ? <Plane className="h-3 w-3" /> : b.vertical === "hotels" ? <Hotel className="h-3 w-3" /> : null} {b.vertical}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{b.provider}</td>
                    <td className="px-4 py-3 text-xs">{b.customer_name ?? "—"}<div className="text-muted-foreground">{b.customer_email}</div></td>
                    <td className="px-4 py-3 font-semibold">{b.currency} {Number(b.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </PartnerShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-success/15 text-success",
    pending: "bg-accent/15 text-accent",
    processing: "bg-accent/15 text-accent",
    cancelled: "bg-muted text-muted-foreground",
    failed: "bg-destructive/15 text-destructive",
    refunded: "bg-blue-500/15 text-blue-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}
