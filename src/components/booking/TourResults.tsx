import { useMemo, useState } from "react";
import { Star, MapPin, Clock, Users, ImageOff, BadgeCheck, Languages } from "lucide-react";

export type Tour = {
  id: string;
  title: string;
  abstract?: string;
  duration?: string;
  price?: number;
  currency?: string;
  rating?: number;
  review_count?: number;
  photo?: string | null;
  city?: string;
  base_price?: number;
  base_currency?: string;
  price_breakdown?: { provider_base: number; travsify_markup: number; total: number; currency: string } | null;
};

type Sort = "recommended" | "cheapest" | "rating";

const DURATION_BUCKETS = [
  { id: "all", label: "Any duration" },
  { id: "short", label: "Up to 3 hours", min: 0, max: 3 },
  { id: "half", label: "Half-day (3–6h)", min: 3, max: 6 },
  { id: "full", label: "Full-day (6h+)", min: 6, max: 100 },
] as const;

type DurationId = (typeof DURATION_BUCKETS)[number]["id"];

/** Parse a free-form duration string like "2 hours", "1.5h", "3-4 hours" into a number of hours. */
function parseHours(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(?:-|to|–)?\s*(\d+(?:\.\d+)?)?\s*(h|hour|hours|day|days|min|minutes)?/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = m[2] ? parseFloat(m[2]) : a;
  const unit = m[3] || "h";
  const avg = (a + b) / 2;
  if (unit.startsWith("d")) return avg * 24;
  if (unit.startsWith("min")) return avg / 60;
  return avg;
}

export function TourResults({
  tours,
  destinationLabel,
  travelers,
  format,
  onSelect,
}: {
  tours: Tour[];
  destinationLabel: string;
  travelers: number;
  format: (amount: number, currency?: string) => string;
  onSelect: (t: Tour) => void;
}) {
  const [sort, setSort] = useState<Sort>("recommended");
  const [minRating, setMinRating] = useState(0);
  const [duration, setDuration] = useState<DurationId>("all");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const priced = useMemo(() => tours.filter((t) => typeof t.price === "number" && t.price > 0), [tours]);

  const priceBounds = useMemo(() => {
    if (!priced.length) return { min: 0, max: 0 };
    const nums = priced.map((t) => Number(t.price));
    return { min: Math.floor(Math.min(...nums)), max: Math.ceil(Math.max(...nums)) };
  }, [priced]);

  const filtered = useMemo(() => {
    let list = priced.filter((t) => (t.rating ?? 0) >= minRating);
    if (maxPrice != null) list = list.filter((t) => Number(t.price) <= maxPrice);
    if (duration !== "all") {
      const bucket = DURATION_BUCKETS.find((b) => b.id === duration) as { min: number; max: number } | undefined;
      if (bucket) {
        list = list.filter((t) => {
          const h = parseHours(t.duration);
          return h != null && h >= bucket.min && h < bucket.max;
        });
      }
    }
    if (sort === "cheapest") list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "rating") list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [priced, minRating, maxPrice, duration, sort]);

  const cheapest = priced.length ? Math.min(...priced.map((t) => Number(t.price))) : 0;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Filter rail */}
      <aside className="space-y-4 rounded-2xl border border-border bg-white p-4 lg:sticky lg:top-24 lg:self-start" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Traveler rating</h4>
          <div className="mt-2 space-y-1">
            {[0, 3, 4, 4.5].map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface">
                <input
                  type="radio"
                  name="rating"
                  checked={minRating === r}
                  onChange={() => setMinRating(r)}
                  className="accent-accent"
                />
                {r === 0 ? <span>All ratings</span> : (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <span className="text-xs">{r}+ stars</span>
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</h4>
          <div className="mt-2 space-y-1">
            {DURATION_BUCKETS.map((b) => (
              <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface">
                <input
                  type="radio"
                  name="duration"
                  checked={duration === b.id}
                  onChange={() => setDuration(b.id)}
                  className="accent-accent"
                />
                <span>{b.label}</span>
              </label>
            ))}
          </div>
        </div>

        {priceBounds.max > priceBounds.min && (
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max price / person</h4>
            <div className="mt-2">
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={maxPrice ?? priceBounds.max}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{format(priceBounds.min)}</span>
                <span className="font-bold text-foreground">≤ {format(maxPrice ?? priceBounds.max)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setMinRating(0); setMaxPrice(null); setDuration("all"); }}
          className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs font-semibold hover:border-accent"
        >
          Clear filters
        </button>
      </aside>

      {/* Results column */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-border bg-white p-3">
          <div>
            <h3 className="font-display text-lg font-extrabold text-primary">
              {filtered.length} of {priced.length} experiences in <span className="text-accent">{destinationLabel}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {travelers} traveler{travelers > 1 ? "s" : ""}
              {priced.length > 0 && <> · from <span className="font-semibold text-foreground">{format(cheapest)}</span> per person</>}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Fulfilled by GetYourGuide · ops-confirmed within hours</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["recommended", "cheapest", "rating"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
                  sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface"
                }`}
              >
                {s === "rating" ? "Top rated" : s}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            No experiences match your filters. Try widening your criteria.
          </div>
        )}

        {filtered.map((t) => (
          <TourCard key={t.id} tour={t} travelers={travelers} format={format} onSelect={() => onSelect(t)} />
        ))}
      </div>
    </div>
  );
}

function TourCard({
  tour, travelers, format, onSelect,
}: { tour: Tour; travelers: number; format: (a: number, c?: string) => string; onSelect: () => void }) {
  const total = Number(tour.price) * travelers;
  return (
    <article className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-white transition hover:border-accent sm:grid-cols-[240px_1fr_180px]" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="relative h-44 bg-surface sm:h-full">
        {tour.photo ? (
          <img src={tour.photo} alt={tour.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        {(tour.rating ?? 0) >= 4.5 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            <BadgeCheck className="h-3 w-3" /> Travelers' choice
          </span>
        )}
      </div>

      <div className="space-y-2 p-4">
        <h4 className="font-display text-base font-extrabold leading-tight text-primary line-clamp-2">{tour.title}</h4>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {tour.city && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {tour.city}</span>
          )}
          {tour.duration && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {tour.duration}</span>
          )}
          <span className="inline-flex items-center gap-1"><Languages className="h-3 w-3" /> English guide</span>
        </div>

        {tour.abstract && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{tour.abstract}</p>
        )}

        {!!tour.rating && (
          <div className="flex items-center gap-1 pt-1">
            <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-bold text-accent">
              <Star className="h-3 w-3 fill-accent text-accent" /> {tour.rating.toFixed(1)}
            </span>
            {!!tour.review_count && (
              <span className="text-[11px] text-muted-foreground">({tour.review_count.toLocaleString()} reviews)</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 font-bold text-accent">Free cancellation</span>
          <span>· Instant voucher</span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-2 border-t border-border bg-surface/40 p-4 sm:border-l sm:border-t-0">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">From / person</div>
          <div className="font-display text-2xl font-extrabold text-primary">{format(Number(tour.price), tour.currency)}</div>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> Total {format(total, tour.currency)} · {travelers}
          </div>
        </div>
        <button
          onClick={onSelect}
          className="btn-glow w-full rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground transition"
        >
          Check availability
        </button>
      </div>
    </article>
  );
}
