import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, ArrowRight, Inbox } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listManualBookings, confirmManualBooking, cancelManualBooking } from "@/server/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/processing")({
  component: ProcessingQueue,
  head: () => ({ meta: [{ title: "Manual fulfillment — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Booking = {
  id: string; reference: string; vertical: string; provider: string;
  customer_name: string | null; customer_email: string | null;
  total_amount: number; currency: string; status: string; created_at: string;
  metadata: Record<string, unknown>; provider_reference: string | null;
};

/**
 * Build the affiliate-tagged portal URL ops uses to fulfill a booking.
 * Returns null if the booking's payload doesn't carry a deep link / if the
 * provider doesn't expose one (we surface the raw metadata in that case).
 */
function affiliatePortalUrl(b: Booking): { url: string; label: string } | null {
  const payload = (b.metadata as { payload?: Record<string, unknown> })?.payload ?? {};
  const aff = (id: string | undefined, key: string) => (id ? `${key}=${encodeURIComponent(id)}` : "");

  if (b.vertical === "visas") {
    const url = (payload.sherpa_url as string) || `https://apply.joinsherpa.com/?affiliateId=${encodeURIComponent("travsify")}`;
    return { url, label: "Sherpa portal" };
  }
  if (b.vertical === "tours") {
    const tourId = payload.tour_id ?? payload.id;
    const partnerId = "travsify"; // GYG partner_id baked into env at runtime
    const url = tourId
      ? `https://www.getyourguide.com/-l${tourId}/?partner_id=${partnerId}`
      : `https://www.getyourguide.com/?partner_id=${partnerId}`;
    return { url, label: "GetYourGuide" };
  }
  if (b.vertical === "transfers") {
    // Mozio doesn't expose a deep-link to a saved quote; ops re-runs the search
    // on the affiliate-branded portal using the customer's pickup details.
    const url = `https://book.mozio.com/?utm_source=travsify&aff=travsify`;
    void aff; // (kept for future per-provider tagging)
    return { url, label: "Mozio portal" };
  }
  if (b.vertical === "insurance") {
    const url = `https://safetywing.com/nomad-insurance/?referenceID=travsify`;
    return { url, label: "SafetyWing portal" };
  }
  if (b.vertical === "car_rentals") {
    // Rentalcars provides the broadest global inventory for manual ops fulfillment.
    const url = `https://www.rentalcars.com/?affiliateCode=travsify`;
    return { url, label: "Rentalcars portal" };
  }
  return null;
}

function ProcessingQueue() {
  const list = useServerFn(listManualBookings);
  const confirm = useServerFn(confirmManualBooking);
  const cancel = useServerFn(cancelManualBooking);
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"processing" | "confirmed" | "cancelled">("processing");
  const [openId, setOpenId] = useState<string | null>(null);
  const [providerRef, setProviderRef] = useState("");
  const [reason, setReason] = useState("");

  async function refresh() {
    setLoading(true);
    const { bookings } = await list({ data: { status: filter } });
    setRows(bookings as Booking[]);
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function handleConfirm(id: string) {
    if (!providerRef.trim()) return toast.error("Enter the provider confirmation #");
    try { await confirm({ data: { booking_id: id, provider_reference: providerRef.trim() } }); toast.success("Booking confirmed"); setOpenId(null); setProviderRef(""); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function handleCancel(id: string) {
    if (!reason.trim()) return toast.error("Enter a cancel reason");
    try { await cancel({ data: { booking_id: id, reason: reason.trim() } }); toast.success("Booking cancelled & wallet refunded"); setOpenId(null); setReason(""); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const ageHours = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 3600000 * 10) / 10;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Operations</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Manual fulfillment queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Affiliate bookings (Transfers, Tours, Visas, Insurance, Car Rentals) waiting for ops to fulfill on the supplier portal.</p>
        </div>
        <div className="flex gap-2">
          {(["processing", "confirmed", "cancelled"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-md border px-3 py-1.5 text-xs font-semibold capitalize ${filter === s ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground hover:border-accent"}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-foreground">No {filter} bookings</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Reference</th>
                <th className="px-4 py-3 text-left font-semibold">Vertical</th>
                <th className="px-4 py-3 text-left font-semibold">Provider</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Age</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <>
                  <tr key={b.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{b.reference}</td>
                    <td className="px-4 py-3 capitalize text-foreground">{b.vertical}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.provider}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.customer_name ?? b.customer_email ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{b.currency} {Number(b.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs ${ageHours(b.created_at) > 2 && filter === "processing" ? "font-semibold text-destructive" : "text-muted-foreground"}`}><Clock className="h-3 w-3" />{ageHours(b.created_at)}h</span></td>
                    <td className="px-4 py-3 text-right">
                      {filter === "processing" ? (
                        <button onClick={() => { setOpenId(openId === b.id ? null : b.id); setProviderRef(""); setReason(""); }} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                          {openId === b.id ? "Close" : "Open"} <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{b.provider_reference ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                  {openId === b.id && (
                    <tr className="bg-surface">
                      <td colSpan={7} className="px-6 py-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking details</h3>
                            {(() => {
                              const portal = affiliatePortalUrl(b);
                              if (!portal) return null;
                              return (
                                <a
                                  href={portal.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground hover:opacity-90"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" /> Open {portal.label} (affiliate-tagged)
                                </a>
                              );
                            })()}
                            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-white p-3 font-mono text-[11px] leading-relaxed text-foreground border border-border">{JSON.stringify(b.metadata, null, 2)}</pre>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-semibold text-foreground">Provider confirmation #</label>
                              <input value={providerRef} onChange={(e) => setProviderRef(e.target.value)} placeholder="MZO-1234567 / GYG-… / Sherpa ref" className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" />
                              <button onClick={() => handleConfirm(b.id)} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm fulfillment
                              </button>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-foreground">Cancel reason (refunds wallet)</label>
                              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provider out of stock…" className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" />
                              <button onClick={() => handleCancel(b.id)} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-destructive bg-white px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white">
                                <XCircle className="h-3.5 w-3.5" /> Cancel & refund
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Need to find a partner? <Link to="/admin" className="text-accent hover:underline">KYC queue →</Link></p>
    </main>
  );
}
