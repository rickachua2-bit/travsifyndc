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
  const [filter, setFilter] = useState<"all" | "flights" | "hotels">("all");

  useEffect(() => { myBookings().then((r) => { setRows(r as Booking[]); setLoading(false); }); }, []);

  const filtered = rows.filter((r) => filter === "all" || r.vertical === filter);

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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-primary">My Bookings</h1>
            <p className="mt-1 text-sm text-muted-foreground">All flights and hotels purchased via API or in-dashboard.</p>
          </div>
          <Link to="/book" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
            <Search className="h-4 w-4" /> Book new
          </Link>
        </div>

        <div className="mt-6 inline-flex rounded-lg border border-border bg-white p-1">
          {(["all", "flights", "hotels"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
          {loading ? (
            <p className="p-8 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-foreground">No bookings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Book a flight or hotel to see it here.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Type</th>
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
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 capitalize">{b.vertical === "flights" ? <Plane className="h-3 w-3" /> : <Hotel className="h-3 w-3" />} {b.vertical}</span></td>
                    <td className="px-4 py-3 text-xs">{b.customer_name ?? "—"}<div className="text-muted-foreground">{b.customer_email}</div></td>
                    <td className="px-4 py-3 font-semibold">{b.currency} {Number(b.total_amount).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{b.status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
