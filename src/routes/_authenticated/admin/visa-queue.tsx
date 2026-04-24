import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Inbox, Clock, ArrowRight } from "lucide-react";
import { adminListVisaApplications } from "@/server/visa-applications.functions";

export const Route = createFileRoute("/_authenticated/admin/visa-queue")({
  component: VisaQueue,
  head: () => ({ meta: [{ title: "Visa applications — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string; reference: string; customer_name: string; customer_email: string;
  status: string; total_amount: number; currency: string; created_at: string;
  destination_name: string; visa_type: string; sherpa_url: string | null;
};

const STATUSES = ["all", "submitted", "documents_pending", "documents_verified", "sent_to_embassy", "approved", "rejected", "delivered", "refunded"] as const;

function VisaQueue() {
  const list = useServerFn(adminListVisaApplications);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<typeof STATUSES[number]>("all");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const { applications } = await list({ data: { status: filter } });
    setRows(applications as Row[]);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const ageHours = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 3600000 * 10) / 10;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Operations</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Visa applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review documents, submit to issuing authority, deliver visas, process refunds.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold capitalize ${filter === s ? "border-accent bg-accent text-white" : "border-border bg-white text-foreground hover:border-accent"}`}>{s.replace(/_/g, " ")}</button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-foreground">No {filter} applications</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Reference</th>
                <th className="px-4 py-3 text-left font-semibold">Corridor</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Age</th>
                <th className="px-4 py-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{r.reference}</td>
                  <td className="px-4 py-3 text-foreground">{r.destination_name} · <span className="text-muted-foreground">{r.visa_type}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{r.customer_name}<div className="text-[10px]">{r.customer_email}</div></td>
                  <td className="px-4 py-3 capitalize"><span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">{r.status.replace(/_/g, " ")}</span></td>
                  <td className="px-4 py-3 font-semibold text-foreground">{r.currency} {Number(r.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{ageHours(r.created_at)}h</span></td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/admin/visa-queue/$id" params={{ id: r.id }} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
