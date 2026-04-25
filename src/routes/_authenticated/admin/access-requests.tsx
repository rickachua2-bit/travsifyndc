import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Building, Globe } from "lucide-react";
import { toast } from "sonner";
import { adminListApiRequests, adminUpdateApiRequest } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/access-requests")({
  component: AdminAccessRequests,
  head: () => ({ meta: [{ title: "API access requests — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Req = {
  id: string;
  email: string;
  full_name: string;
  company: string;
  country: string | null;
  monthly_volume: string | null;
  verticals: string[];
  use_case: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["pending", "contacted", "approved", "rejected"] as const;

function AdminAccessRequests() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUSES)[number] | "all">("pending");

  async function refresh() {
    setLoading(true);
    try { setRows(((await adminListApiRequests({ data: { status: filter } })).requests) as Req[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function setStatus(id: string, status: (typeof STATUSES)[number]) {
    try { await adminUpdateApiRequest({ data: { id, status } }); toast.success(`Marked ${status}`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Sales pipeline</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">API access requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">Companies asking for production API access. Triage, contact, and convert to onboarded partners.</p>

      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1">
        {(["all", ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-white p-12 text-center text-sm text-muted-foreground">No requests.</div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-extrabold text-primary truncate">{r.company}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Building className="h-3 w-3" /> {r.full_name}</span>
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-accent"><Mail className="h-3 w-3" /> {r.email}</a>
                    {r.country && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {r.country}</span>}
                  </div>
                </div>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase text-accent capitalize">{r.status}</span>
              </div>

              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                {r.monthly_volume && <div><dt className="text-muted-foreground">Monthly volume</dt><dd className="font-semibold">{r.monthly_volume}</dd></div>}
                {r.verticals?.length > 0 && <div><dt className="text-muted-foreground">Verticals</dt><dd className="font-semibold capitalize">{r.verticals.join(", ")}</dd></div>}
              </dl>

              {r.use_case && (
                <div className="mt-3 rounded-md bg-surface p-3 text-xs">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Use case</div>
                  <p className="mt-1 text-foreground">{r.use_case}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                <div className="flex gap-1">
                  {r.status !== "contacted" && <button onClick={() => setStatus(r.id, "contacted")} className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:border-accent hover:text-accent">Mark contacted</button>}
                  {r.status !== "approved" && <button onClick={() => setStatus(r.id, "approved")} className="rounded-md bg-success px-2 py-1 text-xs font-semibold text-white hover:bg-success/90">Approve</button>}
                  {r.status !== "rejected" && <button onClick={() => setStatus(r.id, "rejected")} className="rounded-md border border-destructive/30 px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10">Reject</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
