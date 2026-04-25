import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, DollarSign, Receipt, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { adminRevenueReport, adminFxRates } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  component: AdminRevenue,
  head: () => ({
    meta: [
      { title: "Revenue & GMV — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const VERTICALS = ["all", "flights", "hotels", "transfers", "tours", "visas", "insurance", "car_rentals"] as const;
const RANGES = [7, 30, 90, 180] as const;

type Report = Awaited<ReturnType<typeof adminRevenueReport>>;
type FxInfo = Awaited<ReturnType<typeof adminFxRates>>;

function AdminRevenue() {
  const [report, setReport] = useState<Report | null>(null);
  const [fx, setFx] = useState<FxInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [vertical, setVertical] = useState<(typeof VERTICALS)[number]>("all");
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [reportCcy, setReportCcy] = useState<"USD" | "NGN">("USD");

  async function refresh() {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([
        adminRevenueReport({
          data: { days, vertical: vertical === "all" ? undefined : vertical, report_currency: reportCcy },
        }),
        adminFxRates(),
      ]);
      setReport(r);
      setFx(f);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [vertical, days, reportCcy]);

  const fmt = useMemo(
    () => (n: number) =>
      `${reportCcy} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    [reportCcy],
  );

  function exportCsv() {
    if (!report) return;
    const header = ["day", "gross", "margin", "bookings"].join(",");
    const lines = report.series.map((d) => [d.day, d.gross.toFixed(2), d.margin.toFixed(2), d.bookings].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${reportCcy}-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Treasury</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Revenue & GMV</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirmed booking volume normalized to a single currency. Cancelled and failed bookings excluded.
      </p>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">Range</span>
          <div className="inline-flex overflow-hidden rounded-md border border-border bg-white">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`px-3 py-1.5 text-xs font-semibold ${days === r ? "bg-primary text-primary-foreground" : "hover:bg-surface"}`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">Currency</span>
          <div className="inline-flex overflow-hidden rounded-md border border-border bg-white">
            {(["USD", "NGN"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setReportCcy(c)}
                className={`px-3 py-1.5 text-xs font-semibold ${reportCcy === c ? "bg-primary text-primary-foreground" : "hover:bg-surface"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">Vertical</span>
          <select
            value={vertical}
            onChange={(e) => setVertical(e.target.value as typeof vertical)}
            className="rounded-md border border-border bg-white px-2 py-1.5 text-xs font-semibold capitalize"
          >
            {VERTICALS.map((v) => (
              <option key={v} value={v}>
                {v.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        <button
          onClick={exportCsv}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Export CSV
        </button>
        {fx && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            FX: 1 USD = {fx.rates.NGN.toFixed(2)} NGN · {fx.source}
          </span>
        )}
      </div>

      {loading || !report ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<DollarSign className="h-4 w-4" />}
              label="Gross GMV"
              value={fmt(report.totals.gross)}
              accent="primary"
            />
            <Kpi
              icon={<TrendingUp className="h-4 w-4" />}
              label="Margin earned"
              value={fmt(report.totals.margin)}
              hint={`${((report.totals.margin / Math.max(report.totals.gross, 1)) * 100).toFixed(1)}% take rate`}
              accent="accent"
            />
            <Kpi
              icon={<Receipt className="h-4 w-4" />}
              label="Confirmed bookings"
              value={report.totals.bookings.toLocaleString()}
              accent="primary"
            />
            <Kpi
              icon={<XCircle className="h-4 w-4" />}
              label="Cancelled / failed"
              value={report.totals.cancelled.toLocaleString()}
              hint={`${((report.totals.cancelled / Math.max(report.totals.bookings + report.totals.cancelled, 1)) * 100).toFixed(1)}% rate`}
              accent="muted"
            />
          </div>

          {/* Time series */}
          <div className="mt-6 rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trend</div>
                <h2 className="mt-1 font-display text-lg font-bold text-primary">GMV & margin · last {days} days</h2>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.series}>
                  <defs>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="gross"
                    name="Gross GMV"
                    stroke="hsl(var(--primary))"
                    fill="url(#grossGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="margin"
                    name="Margin"
                    stroke="hsl(var(--accent))"
                    fill="url(#marginGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By vertical + provider */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Margin by vertical">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.by_vertical} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="vertical" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                      formatter={(value: number) => fmt(value)}
                    />
                    <Bar dataKey="margin" name="Margin" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="GMV by provider">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.by_provider}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="provider" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                      formatter={(value: number) => fmt(value)}
                    />
                    <Bar dataKey="gross" name="Gross" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {/* Top partners */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="border-b border-border px-6 py-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</div>
              <h2 className="mt-1 font-display text-lg font-bold text-primary">Top 10 partners by GMV</h2>
            </div>
            {report.top_partners.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">No bookings in this window.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">#</th>
                    <th className="px-6 py-3 text-left font-semibold">Partner</th>
                    <th className="px-6 py-3 text-right font-semibold">Bookings</th>
                    <th className="px-6 py-3 text-right font-semibold">Gross</th>
                    <th className="px-6 py-3 text-right font-semibold">Margin</th>
                    <th className="px-6 py-3 text-right font-semibold">Take rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.top_partners.map((p, i) => (
                    <tr key={p.user_id} className="border-t border-border hover:bg-surface/50">
                      <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-6 py-3 font-semibold">{p.label}</td>
                      <td className="px-6 py-3 text-right">{p.bookings}</td>
                      <td className="px-6 py-3 text-right font-mono">{fmt(p.gross)}</td>
                      <td className="px-6 py-3 text-right font-mono text-accent">{fmt(p.margin)}</td>
                      <td className="px-6 py-3 text-right text-xs text-muted-foreground">
                        {((p.margin / Math.max(p.gross, 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "accent" | "muted";
}) {
  const ring =
    accent === "accent"
      ? "ring-accent/20 bg-accent/5 text-accent"
      : accent === "muted"
        ? "ring-border bg-surface text-muted-foreground"
        : "ring-primary/20 bg-primary/5 text-primary";
  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 ${ring}`}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3 font-display text-2xl font-extrabold text-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
