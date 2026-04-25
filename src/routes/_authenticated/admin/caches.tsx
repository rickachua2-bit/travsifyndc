import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminCacheStats, adminPurgeCache } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/caches")({
  component: AdminCaches,
  head: () => ({
    meta: [
      { title: "Cache Management — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Stats = Awaited<ReturnType<typeof adminCacheStats>>;
type CacheRow = Stats["caches"][number];
type PurgeMode = "all" | "stale_7d" | "stale_24h";

function AdminCaches() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await adminCacheStats();
      setStats(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function purge(c: CacheRow, mode: PurgeMode) {
    const confirmText =
      mode === "all" ? `Delete ALL ${c.total.toLocaleString()} entries from ${c.label}?` : `Purge ${mode === "stale_24h" ? "entries older than 24h" : "entries older than 7d"} from ${c.label}?`;
    if (!confirm(confirmText)) return;
    setBusy(`${c.key}_${mode}`);
    try {
      const r = await adminPurgeCache({
        data: {
          cache_key: c.key as "tour_quote_cache" | "transfer_quote_cache" | "insurance_quote_cache" | "car_rental_quote_cache",
          mode,
        },
      });
      toast.success(`Purged ${r.deleted.toLocaleString()} rows from ${c.label}`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Health</div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-primary">Cache management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quote caches for affiliate verticals. Purging forces a fresh provider scrape on next request.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold hover:border-accent hover:text-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading && !stats ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-border bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {stats?.caches.map((c) => (
            <div
              key={c.key}
              className="rounded-2xl border border-border bg-white p-6"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
                    <Database className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {c.vertical}
                    </div>
                    <div className="font-display text-lg font-bold text-primary">{c.label}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Last scrape
                  </div>
                  <div className="text-xs font-mono">
                    {c.last_scraped_at ? new Date(c.last_scraped_at).toLocaleString() : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                <Tile label="Total entries" value={c.total.toLocaleString()} />
                <Tile label="Fresh (24h)" value={c.fresh_24h.toLocaleString()} accent="ok" />
                <Tile label="Stale (7d+)" value={c.stale_7d.toLocaleString()} accent="warn" />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <PurgeBtn
                  busy={busy === `${c.key}_stale_24h`}
                  onClick={() => purge(c, "stale_24h")}
                  label="Purge >24h"
                  variant="soft"
                />
                <PurgeBtn
                  busy={busy === `${c.key}_stale_7d`}
                  onClick={() => purge(c, "stale_7d")}
                  label="Purge >7d"
                  variant="soft"
                />
                <PurgeBtn
                  busy={busy === `${c.key}_all`}
                  onClick={() => purge(c, "all")}
                  label="Purge ALL"
                  variant="danger"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: "ok" | "warn" }) {
  const cls =
    accent === "ok"
      ? "bg-emerald-50 text-emerald-700"
      : accent === "warn"
        ? "bg-amber-50 text-amber-700"
        : "bg-surface text-primary";
  return (
    <div className={`rounded-md px-3 py-2 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

function PurgeBtn({
  onClick,
  busy,
  label,
  variant,
}: {
  onClick: () => void;
  busy: boolean;
  label: string;
  variant: "soft" | "danger";
}) {
  const cls =
    variant === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border-border bg-white text-primary hover:border-accent hover:text-accent";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${cls}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
