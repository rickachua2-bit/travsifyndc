import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Search, Loader2, Building2, Clock, CheckCircle2, XCircle, Inbox } from "lucide-react";

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
  const [counts, setCounts] = useState<Record<string, number>>({});

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

  // Load counts per status for the stat cards
  useEffect(() => {
    Promise.all(
      FILTERS.map((s) =>
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("kyc_status", s).then(({ count }) => [s, count ?? 0] as const),
      ),
    ).then((entries) => setCounts(Object.fromEntries(entries)));
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Compliance</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">KYC review queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approve or reject business applications. Oldest first.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, contact, country…"
            className="w-full rounded-md border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Inbox className="h-4 w-4" />} label="Awaiting review" value={counts.submitted ?? 0} tone="accent" active={filter === "submitted"} onClick={() => setFilter("submitted")} />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Under review" value={counts.under_review ?? 0} tone="blue" active={filter === "under_review"} onClick={() => setFilter("under_review")} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={counts.approved ?? 0} tone="success" active={filter === "approved"} onClick={() => setFilter("approved")} />
        <StatCard icon={<XCircle className="h-4 w-4" />} label="Rejected" value={counts.rejected ?? 0} tone="destructive" active={filter === "rejected"} onClick={() => setFilter("rejected")} />
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

function StatCard({
  icon, label, value, tone, active, onClick,
}: {
  icon: React.ReactNode; label: string; value: number;
  tone: "accent" | "blue" | "success" | "destructive";
  active: boolean; onClick: () => void;
}) {
  const tones: Record<string, string> = {
    accent: "bg-accent/10 text-accent",
    blue: "bg-blue-500/10 text-blue-600",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <button
      onClick={onClick}
      className={`group rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 ${
        active ? "border-accent shadow-md" : "border-border"
      }`}
      style={{ boxShadow: active ? "var(--shadow-accent)" : "var(--shadow-soft)" }}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
        {active && <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Viewing</span>}
      </div>
      <div className="mt-3 font-display text-2xl font-extrabold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
