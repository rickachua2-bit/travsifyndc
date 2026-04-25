import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, Shield, Users as UsersIcon, ArrowRight } from "lucide-react";
import { adminListUsers } from "@/server/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
  head: () => ({ meta: [{ title: "Users & partners — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string;
  full_name: string | null;
  legal_name: string | null;
  trading_name: string | null;
  company: string | null;
  country: string | null;
  incorporation_country: string | null;
  kyc_status: string;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  created_at: string;
  monthly_volume: string | null;
  target_verticals: string[] | null;
  is_admin: boolean;
};

const FILTERS = ["all", "draft", "submitted", "under_review", "approved", "rejected"] as const;

function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const res = await adminListUsers({ data: { kyc_status: filter, q: q.trim() || undefined } });
      setRows(res.users as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Platform</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Users & partners</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every account on the platform. Click a row to open their KYC file.</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); refresh(); }}
          className="relative w-full sm:w-80"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, legal name…"
            className="w-full rounded-md border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </form>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              filter === f
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-white text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><UsersIcon className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-foreground">No users match this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th>Account</Th>
                  <Th>Company</Th>
                  <Th>Country</Th>
                  <Th>KYC</Th>
                  <Th>Monthly volume</Th>
                  <Th>Joined</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{r.full_name || "—"}</span>
                        {r.is_admin && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>{r.legal_name || r.trading_name || r.company || "—"}</Td>
                    <Td>{r.incorporation_country || r.country || "—"}</Td>
                    <Td><KycBadge status={r.kyc_status} /></Td>
                    <Td>{r.monthly_volume || "—"}</Td>
                    <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      <Link
                        to="/admin/applications/$id"
                        params={{ id: r.id }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Td>
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

function KycBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    approved: "bg-success/10 text-success border-success/30",
    rejected: "bg-destructive/10 text-destructive border-destructive/30",
    submitted: "bg-accent/10 text-accent border-accent/30",
    under_review: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    draft: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${tones[status] ?? tones.draft}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
