import { Shield, ShieldCheck, BadgeCheck, Heart, Plane } from "lucide-react";

export type InsuranceQuote = {
  id: string;
  plan_name: string;
  coverage_type: string;
  provider?: string;
  duration_days: number;
  price: number;
  base_price?: number;
  base_currency?: string;
  currency: string;
  per_traveler: number;
  coverage_summary: {
    medical_max: number;
    deductible: number;
    covid_covered: boolean;
    adventure_sports: boolean;
  };
  benefits: string[];
  price_breakdown?: { provider_base: number; travsify_markup: number; total: number; currency: string } | null;
};

export function InsuranceResults({
  quotes,
  travelersCount,
  destinationLabel,
  format,
  onSelect,
}: {
  quotes: InsuranceQuote[];
  travelersCount: number;
  destinationLabel: string;
  format: (amount: number, currency?: string) => string;
  onSelect: (q: InsuranceQuote) => void;
}) {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-border bg-white p-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-primary">
            {quotes.length} plan{quotes.length === 1 ? "" : "s"} for <span className="text-accent">{destinationLabel}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {travelersCount} traveler{travelersCount > 1 ? "s" : ""} · {quotes[0]?.duration_days ?? 0} day{(quotes[0]?.duration_days ?? 0) !== 1 ? "s" : ""}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Policy bound by ops within hours · cover starts on your travel date</p>
        </div>
      </div>

      {quotes.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          No plans available for that combination. Try shorter dates or a different destination.
        </div>
      )}

      {quotes.map((q) => (
        <article
          key={q.id}
          className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-white transition hover:border-accent sm:grid-cols-[1fr_220px]"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="space-y-3 p-5">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-display text-base font-extrabold text-primary">{q.plan_name}</h4>
                <p className="text-xs capitalize text-muted-foreground">{q.coverage_type.replace(/_/g, " ")} cover</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <KeyStat icon={Heart} label="Medical maximum" value={`$${q.coverage_summary.medical_max.toLocaleString()}`} />
              <KeyStat icon={ShieldCheck} label="Deductible" value={`$${q.coverage_summary.deductible.toLocaleString()}`} />
              <KeyStat icon={BadgeCheck} label="COVID-19" value={q.coverage_summary.covid_covered ? "Covered" : "Not covered"} good={q.coverage_summary.covid_covered} />
              <KeyStat icon={Plane} label="Adventure sports" value={q.coverage_summary.adventure_sports ? "Included" : "Optional add-on"} />
            </div>

            <ul className="grid gap-1 text-[12px] text-muted-foreground sm:grid-cols-2">
              {q.benefits.slice(0, 6).map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <BadgeCheck className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-end justify-between gap-3 border-t border-border bg-surface/40 p-5 sm:border-l sm:border-t-0">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total · {q.duration_days} day{q.duration_days !== 1 ? "s" : ""}</div>
              <div className="font-display text-2xl font-extrabold text-primary">{format(Number(q.price), q.currency)}</div>
              <div className="text-[11px] text-muted-foreground">
                {format(Number(q.per_traveler), q.currency)} per traveler
              </div>
            </div>
            <button
              onClick={() => onSelect(q)}
              className="btn-glow w-full rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
            >
              Buy policy
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function KeyStat({
  icon: Icon, label, value, good,
}: { icon: typeof Shield; label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface/40 p-2">
      <Icon className={`h-4 w-4 flex-shrink-0 ${good ? "text-accent" : "text-muted-foreground"}`} />
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}
