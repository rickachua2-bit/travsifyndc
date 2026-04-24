import { useMemo, useState } from "react";
import { Car, Users, Briefcase, Snowflake, Settings, ShieldCheck } from "lucide-react";

export type CarRentalQuote = {
  id: string;
  car_class: "economy" | "compact" | "midsize" | "suv" | "premium" | "minivan";
  car_description: string;
  example_model: string;
  transmission: "automatic" | "manual";
  passengers: number;
  bags: number;
  air_conditioning: boolean;
  unlimited_mileage: boolean;
  total_price: number;
  base_price?: number;
  base_currency?: string;
  per_day_price: number;
  rental_days: number;
  currency: string;
  pickup_location: string;
  dropoff_location: string;
  cancellation_policy: string;
  provider_name: string;
  price_breakdown?: { provider_base: number; travsify_markup: number; total: number; currency: string } | null;
};

type Sort = "cheapest" | "biggest";

export function CarRentalResults({
  quotes,
  routeLabel,
  format,
  onSelect,
}: {
  quotes: CarRentalQuote[];
  routeLabel: string;
  format: (amount: number, currency?: string) => string;
  onSelect: (q: CarRentalQuote) => void;
}) {
  const [sort, setSort] = useState<Sort>("cheapest");

  const sorted = useMemo(() => {
    const list = [...quotes];
    if (sort === "cheapest") list.sort((a, b) => a.total_price - b.total_price);
    else list.sort((a, b) => b.passengers - a.passengers);
    return list;
  }, [quotes, sort]);

  const cheapest = quotes.length ? Math.min(...quotes.map((q) => q.total_price)) : 0;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-border bg-white p-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-primary">
            {sorted.length} rental option{sorted.length === 1 ? "" : "s"} for <span className="text-accent">{routeLabel}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            From <span className="font-semibold text-foreground">{format(cheapest)}</span> total · all taxes included
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Curated from leading rental partners · ops-confirmed within hours
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["cheapest", "biggest"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
                sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface"
              }`}
            >
              {s === "cheapest" ? "Cheapest" : "Biggest"}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          No rental cars available for those dates and location. Try different dates.
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
              <h4 className="font-display text-base font-extrabold text-primary">{q.car_description}</h4>
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                {q.car_class}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {q.passengers}</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {q.bags}</span>
              <span className="inline-flex items-center gap-1"><Settings className="h-3 w-3" /> {q.transmission}</span>
              {q.air_conditioning && <span className="inline-flex items-center gap-1"><Snowflake className="h-3 w-3" /> A/C</span>}
              {q.unlimited_mileage && <span className="inline-flex items-center gap-1">∞ km</span>}
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {q.cancellation_policy}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {q.rental_days} day{q.rental_days > 1 ? "s" : ""} · {format(q.per_day_price, q.currency)} / day
            </p>
          </div>

          <div className="flex flex-col items-end justify-between gap-2 border-t border-border bg-surface/40 p-4 sm:border-l sm:border-t-0">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-2xl font-extrabold text-primary">{format(q.total_price, q.currency)}</div>
              <div className="text-[11px] text-muted-foreground">All taxes included</div>
            </div>
            <button
              onClick={() => onSelect(q)}
              className="btn-glow w-full rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
            >
              Book this car
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
