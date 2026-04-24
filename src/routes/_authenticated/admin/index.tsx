import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Search, Loader2, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminQueue,
  head: () => ({ meta: [{ title: "KYC queue — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string;
  full_name: string | null;
  legal_name: string | null;
  company: string | null;
  incorporation_country: string | null;
  kyc_status: string;
  kyc_submitted_at: string | null;
};

const FILTERS = ["submitted", "under_review", "approved", "rejected"] as const;

function AdminQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("submitted");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, legal_name, company, incorporation_country, kyc_status, kyc_submitted_at")
      .eq("kyc_status", filter)
      .order("kyc_submitted_at", { ascending: true, nullsFirst: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      });
  }, [filter]);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      r.legal_name?.toLowerCase().includes(s) ||
      r.company?.toLowerCase().includes(s) ||
      r.full_name?.toLowerCase().includes(s) ||
      r.incorporation_country?.toLowerCase().includes(s)
    );
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Compliance</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">KYC review queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approve or reject business applications. Oldest first.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, contact, country…"
            className="w-full rounded-md border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === f ? "border-accent bg-accent/10 text-accent" : "border-border bg-white text-foreground hover:border-accent/60"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Building2 className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-foreground">No applications {filter.replace("_", " ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">When new submissions arrive, they'll show up here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Company</Th>
                <Th>Contact</Th>
                <Th>Country</Th>
                <Th>Submitted</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                  <Td><span className="font-semibold text-foreground">{r.legal_name ?? r.company ?? "—"}</span></Td>
                  <Td>{r.full_name ?? "—"}</Td>
                  <Td>{r.incorporation_country ?? "—"}</Td>
                  <Td>{r.kyc_submitted_at ? new Date(r.kyc_submitted_at).toLocaleString() : "—"}</Td>
                  <Td className="text-right">
                    <Link to="/admin/applications/$id" params={{ id: r.id }} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
