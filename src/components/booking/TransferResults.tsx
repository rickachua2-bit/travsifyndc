import { useMemo, useState } from "react";
import { Car, Clock, Users, ShieldCheck } from "lucide-react";

export type TransferQuote = {
  id: string;
  vehicle_class: string;
  vehicle_description: string;
  provider_name: string;
  total_price: number;
  base_price?: number;
  base_currency?: string;
  currency: string;
  duration_minutes: number;
  cancellation_policy: string;
  price_breakdown?: { provider_base: number; travsify_markup: number; total: number; currency: string } | null;
};

type Sort = "cheapest" | "fastest";

export function TransferResults({
  quotes,
  routeLabel,
  passengers,
  format,
  onSelect,
}: {
  quotes: TransferQuote[];
  routeLabel: string;
  passengers: number;
  format: (amount: number, currency?: string) => string;
  onSelect: (q: TransferQuote) => void;
}) {
  const [sort, setSort] = useState<Sort>("cheapest");

  const sorted = useMemo(() => {
    const list = [...quotes];
    if (sort === "cheapest") list.sort((a, b) => Number(a.total_price) - Number(b.total_price));
    else list.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
    return list;
  }, [quotes, sort]);

  const cheapest = quotes.length ? Math.min(...quotes.map((q) => Number(q.total_price))) : 0;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-border bg-white p-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-primary">
            {sorted.length} transfer{sorted.length === 1 ? "" : "s"} for <span className="text-accent">{routeLabel}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {passengers} passenger{passengers > 1 ? "s" : ""} · from <span className="font-semibold text-foreground">{format(cheapest)}</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Fulfilled by Mozio · ops-confirmed within hours</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["cheapest", "fastest"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
                sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          No transfers available for that route and time. Try a different time or address.
        </div>
      )}

      {sorted.map((q) => (
        <article
          key={q.id}
          className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-white transition hover:border-accent sm:grid-cols-[80px_1fr_180px]"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center justify-center bg-surface/40 p-4">
            <Car className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-display text-base font-extrabold text-primary">{q.vehicle_description}</h4>
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">{q.vehicle_class}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {q.duration_minutes > 0 && (
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> ~{q.duration_minutes} min</span>
              )}
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Up to {passengers}</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {q.cancellation_policy}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Operated by <span className="font-semibold text-foreground">{q.provider_name}</span></p>
          </div>

          <div className="flex flex-col items-end justify-between gap-2 border-t border-border bg-surface/40 p-4 sm:border-l sm:border-t-0">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-2xl font-extrabold text-primary">{format(Number(q.total_price), q.currency)}</div>
              <div className="text-[11px] text-muted-foreground">All taxes included</div>
            </div>
            <button
              onClick={() => onSelect(q)}
              className="btn-glow w-full rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
            >
              Book this transfer
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
