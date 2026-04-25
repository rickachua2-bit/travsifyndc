import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plane, Hotel, Inbox, Search, MapPin, Car, Shield, Globe2, Bus, X, ExternalLink } from "lucide-react";
import { myBookings } from "@/server/dashboard.functions";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { getServerFnAuthHeaders } from "@/lib/server-fn-auth";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
  head: () => ({ meta: [{ title: "Bookings — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

type Booking = {
  id: string; reference: string; vertical: string; provider: string;
  customer_name: string | null; customer_email: string | null;
  total_amount: number; currency: string; status: string;
  provider_reference: string | null; created_at: string;
  metadata?: Record<string, unknown> | null;
};

const VERTICALS = ["all", "flights", "hotels", "transfers", "tours", "car_rentals", "visas", "insurance"] as const;
const STATUSES = ["all", "confirmed", "pending", "processing", "failed", "cancelled", "refunded"] as const;

const VERTICAL_ICON: Record<string, typeof Plane> = {
  flights: Plane, hotels: Hotel, transfers: Bus, tours: MapPin,
  car_rentals: Car, visas: Globe2, insurance: Shield,
};

function BookingsPage() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof VERTICALS)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("all");
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    myBookings()
      .then((r) => { if (active) { setRows((r ?? []) as Booking[]); setError(null); } })
      .catch((e) => { if (active) setError((e as Error).message || "Failed to load bookings"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    (filter === "all" || r.vertical === filter) &&
    (statusFilter === "all" || r.status === statusFilter)
  ), [rows, filter, statusFilter]);

  return (
    <PartnerShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-primary">Bookings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every booking placed via the API or in-app, across all verticals.</p>
          </div>
          <Link to="/dashboard-book" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
            <Search className="h-4 w-4" /> Book new
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap rounded-lg border border-border bg-white p-1">
            {VERTICALS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f.replace(/_/g, " ")}</button>
            ))}
          </div>
          <div className="inline-flex flex-wrap rounded-lg border border-border bg-white p-1">
            {STATUSES.map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${statusFilter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
            ))}
          </div>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
          {loading ? (
            <p className="p-8 text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-destructive">Couldn't load bookings</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-foreground">{rows.length === 0 ? "No bookings yet" : "No bookings match these filters"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{rows.length === 0 ? "Place your first booking from the search page." : "Try a different vertical or status."}</p>
              {rows.length === 0 && (
                <Link to="/dashboard-book" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
                  <Search className="h-3 w-3" /> Start a search
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const Icon = VERTICAL_ICON[b.vertical] ?? Inbox;
                  return (
                    <tr key={b.id} onClick={() => setSelected(b)} className="cursor-pointer border-t border-border hover:bg-surface/50">
                      <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 capitalize"><Icon className="h-3 w-3" /> {b.vertical.replace(/_/g, " ")}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{b.provider}</td>
                      <td className="px-4 py-3 text-xs">{b.customer_name ?? "—"}<div className="text-muted-foreground">{b.customer_email}</div></td>
                      <td className="px-4 py-3 text-right font-semibold">{b.currency} {Number(b.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-accent">View →</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {selected && <BookingDrawer booking={selected} onClose={() => setSelected(null)} />}
    </PartnerShell>
  );
}

function BookingDrawer({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const meta = (booking.metadata ?? {}) as Record<string, unknown>;
  const breakdown = meta.price_breakdown as Record<string, number> | undefined;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{booking.vertical.replace(/_/g, " ")} booking</p>
            <p className="font-mono text-sm font-bold text-foreground">{booking.reference}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-6 p-6 text-sm">
          <div className="flex items-center justify-between">
            <StatusPill status={booking.status} />
            <span className="text-xs text-muted-foreground">{new Date(booking.created_at).toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Customer" value={booking.customer_name ?? "—"} />
            <Field label="Email" value={booking.customer_email ?? "—"} />
            <Field label="Provider" value={booking.provider} />
            <Field label="Provider ref" value={booking.provider_reference ?? "Pending"} mono />
          </div>

          {breakdown && (
            <div className="rounded-xl border border-border bg-surface/40 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Price breakdown</p>
              <Row label="Provider base" value={`${booking.currency} ${Number(breakdown.provider_base ?? 0).toFixed(2)}`} />
              {Number(breakdown.travsify_markup ?? 0) > 0 && <Row label="Service fee" value={`${booking.currency} ${Number(breakdown.travsify_markup).toFixed(2)}`} />}
              {Number(breakdown.partner_markup ?? 0) > 0 && <Row label="Your markup" value={`${booking.currency} ${Number(breakdown.partner_markup).toFixed(2)}`} />}
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
                <span>Total charged</span>
                <span>{booking.currency} {Number(booking.total_amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {booking.status === "processing" && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-foreground">
              Our ops team is fulfilling this with the provider. You'll get an email once confirmed (usually within a few hours).
            </div>
          )}
          {booking.status === "pending" && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Awaiting payment confirmation.
            </div>
          )}
          {booking.status === "failed" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              Provider could not fulfill this booking. Funds have been refunded to your wallet.
            </div>
          )}

          <details className="rounded-lg border border-border bg-surface/30 p-3">
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Raw metadata</summary>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[10px] text-foreground">{JSON.stringify(meta, null, 2)}</pre>
          </details>

          <Link to="/wallet" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
            View wallet activity <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm"} text-foreground`}>{value}</p>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold text-foreground">{value}</span></div>;
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
