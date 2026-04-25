import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, Activity, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { adminListApiLogs, adminApiLogsSummary } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/api-logs")({
  component: AdminApiLogs,
  head: () => ({ meta: [{ title: "API logs — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Log = {
  id: string;
  user_id: string | null;
  api_key_id: string | null;
  environment: string;
  method: string;
  endpoint: string;
  status_code: number;
  latency_ms: number | null;
  provider: string | null;
  vertical: string | null;
  error_code: string | null;
  request_id: string | null;
  ip_address: string | null;
  created_at: string;
};

const ENVS = ["all", "sandbox", "live"] as const;
const STATUS_CLASSES = ["all", "2xx", "4xx", "5xx"] as const;
const VERTICALS = ["all", "flights", "hotels", "transfers", "tours", "visas", "insurance", "car_rentals"] as const;

function AdminApiLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof adminApiLogsSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState<(typeof ENVS)[number]>("all");
  const [statusClass, setStatusClass] = useState<(typeof STATUS_CLASSES)[number]>("all");
  const [vertical, setVertical] = useState<(typeof VERTICALS)[number]>("all");
  const [q, setQ] = useState("");

  useEffect(() => { adminApiLogsSummary().then(setSummary).catch(() => {}); }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await adminListApiLogs({
        data: {
          environment: env === "all" ? undefined : env,
          status_class: statusClass,
          vertical: vertical === "all" ? undefined : vertical,
          q: q || undefined,
          limit: 300,
        },
      });
      setLogs(res.logs as Log[]);
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [env, statusClass, vertical]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Developers</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">API request logs</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live trail of every authenticated API call. Use to debug partner integrations.</p>

      {summary && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Last 24h" value={summary.total} icon={<Activity className="h-4 w-4" />} />
          <Stat label="2xx OK" value={summary.ok} tone="success" />
          <Stat label="4xx client" value={summary.client_err} tone="accent" />
          <Stat label="5xx server" value={summary.server_err} tone="destructive" icon={<AlertTriangle className="h-4 w-4" />} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select label="Env" value={env} onChange={(v) => setEnv(v as typeof env)} options={ENVS} />
        <Select label="Status" value={statusClass} onChange={(v) => setStatusClass(v as typeof statusClass)} options={STATUS_CLASSES} />
        <Select label="Vertical" value={vertical} onChange={(v) => setVertical(v as typeof vertical)} options={VERTICALS} />
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} placeholder="Endpoint, request id, error code…" className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm" />
        </div>
        <button onClick={refresh} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Search</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No requests match the filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>When</Th><Th>Method</Th><Th>Endpoint</Th><Th>Status</Th><Th>Latency</Th><Th>Env</Th><Th>Vertical</Th><Th>Error</Th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                  <Td className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</Td>
                  <Td className="font-mono text-[11px]"><span className="rounded bg-muted px-1.5 py-0.5">{l.method}</span></Td>
                  <Td className="font-mono text-[11px] max-w-md truncate">{l.endpoint}</Td>
                  <Td><StatusBadge code={l.status_code} /></Td>
                  <Td className="font-mono text-[11px] text-muted-foreground">{l.latency_ms ? `${l.latency_ms}ms` : "—"}</Td>
                  <Td className="text-xs">{l.environment}</Td>
                  <Td className="text-xs">{l.vertical ?? "—"}</Td>
                  <Td className="text-xs text-destructive">{l.error_code ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ code }: { code: number }) {
  const tone = code < 300 ? "success" : code < 500 ? "accent" : "destructive";
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{code}</span>;
}

function Stat({ label, value, tone, icon }: { label: string; value: number; tone?: "success" | "accent" | "destructive"; icon?: React.ReactNode }) {
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-2xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center gap-2">
        {icon && <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone ? tones[tone] : "bg-muted text-muted-foreground"}`}>{icon}</div>}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 font-display text-2xl font-extrabold text-primary">{value.toLocaleString()}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-border bg-white px-2 py-1.5 text-xs font-semibold capitalize">
        {options.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
      </select>
    </label>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
