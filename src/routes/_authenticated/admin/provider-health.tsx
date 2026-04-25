import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { adminProviderHealth } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/provider-health")({
  component: ProviderHealth,
  head: () => ({
    meta: [
      { title: "Provider Health — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Report = Awaited<ReturnType<typeof adminProviderHealth>>;

const PROVIDER_LABELS: Record<string, string> = {
  duffel: "Duffel (Flights NDC)",
  ndc: "Direct NDC",
  liteapi: "LiteAPI (Hotels)",
  mozio: "Mozio (Transfers)",
  getyourguide: "GetYourGuide (Tours)",
  safetywing: "SafetyWing (Insurance)",
  sherpa: "Sherpa (Visas)",
  stripe: "Stripe (Cards)",
  fincra: "Fincra (NGN)",
};

function ProviderHealth() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const r = await adminProviderHealth();
      setReport(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Health</div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-primary">Provider health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last 24h API call telemetry per upstream provider. Auto-refreshes every 30s.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading && !report ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report?.providers.map((p) => (
            <ProviderCard key={p.provider} p={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function ProviderCard({ p }: { p: Report["providers"][number] }) {
  const StatusIcon =
    p.status === "healthy"
      ? CheckCircle2
      : p.status === "degraded"
        ? AlertTriangle
        : p.status === "down"
          ? XCircle
          : MinusCircle;
  const statusClass =
    p.status === "healthy"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : p.status === "degraded"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : p.status === "down"
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-surface text-muted-foreground ring-border";

  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {PROVIDER_LABELS[p.provider] ?? p.provider}
          </div>
          <div className="mt-0.5 font-display text-lg font-bold text-primary">{p.provider}</div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusClass}`}
        >
          <StatusIcon className="h-3 w-3" /> {p.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <Stat label="Calls" value={p.total.toLocaleString()} />
        <Stat label="Errors" value={p.errors.toLocaleString()} accent={p.errors > 0 ? "danger" : "default"} />
        <Stat label="Err rate" value={`${(p.error_rate * 100).toFixed(1)}%`} />
        <Stat label="P50 ms" value={p.p50_latency.toString()} />
        <Stat label="P95 ms" value={p.p95_latency.toString()} />
        <Stat
          label="Last"
          value={p.last_call_at ? timeAgo(p.last_call_at) : "—"}
          hint={p.last_status ? `HTTP ${p.last_status}` : undefined}
        />
      </div>

      {p.last_error && (
        <div className="mt-3 truncate rounded-md bg-rose-50 px-2 py-1 text-[11px] font-mono text-rose-700">
          <Activity className="mr-1 inline h-3 w-3" />
          {p.last_error}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "danger";
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${accent === "danger" ? "text-rose-600" : "text-primary"}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
