import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { adminListScrapeRuns } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/scrape-runs")({
  component: ScrapeRuns,
  head: () => ({
    meta: [
      { title: "Scrape Runs — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Runs = Awaited<ReturnType<typeof adminListScrapeRuns>>;

function ScrapeRuns() {
  const [runs, setRuns] = useState<Runs["runs"]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const r = await adminListScrapeRuns();
      setRuns(r.runs);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Health</div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-primary">Visa scrape runs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            History of Sherpa visa product scrape jobs. Last 100 runs.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No scrape runs yet. Trigger one from the visa products page.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Started</th>
                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                <th className="px-4 py-3 text-right font-semibold">Corridors</th>
                <th className="px-4 py-3 text-right font-semibold">Scraped</th>
                <th className="px-4 py-3 text-right font-semibold">Upserted</th>
                <th className="px-4 py-3 text-right font-semibold">Failed</th>
                <th className="px-4 py-3 text-left font-semibold">Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const Icon =
                  r.status === "completed" ? CheckCircle2 : r.status === "failed" ? XCircle : Clock;
                const statusCls =
                  r.status === "completed"
                    ? "text-emerald-600"
                    : r.status === "failed"
                      ? "text-rose-600"
                      : "text-amber-600";
                const duration = r.completed_at
                  ? Math.round((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000)
                  : null;
                const errs = Array.isArray(r.errors) ? r.errors : [];
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusCls}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {new Date(r.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {duration !== null ? `${duration}s` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{r.total_corridors}</td>
                    <td className="px-4 py-3 text-right font-mono">{r.scraped_count}</td>
                    <td className="px-4 py-3 text-right font-mono text-accent">{r.upserted_count}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={r.failed_count > 0 ? "text-rose-600" : "text-muted-foreground"}>
                        {r.failed_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {errs.length > 0 ? (
                        <details>
                          <summary className="cursor-pointer text-rose-600">{errs.length} errors</summary>
                          <pre className="mt-2 max-h-40 max-w-xs overflow-auto rounded bg-surface p-2 text-[10px]">
                            {JSON.stringify(errs, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
