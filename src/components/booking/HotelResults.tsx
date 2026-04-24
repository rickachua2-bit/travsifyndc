import { useMemo, useState } from "react";
import { Star, MapPin, Wifi, Coffee, Car, Dumbbell, Waves, ImageOff } from "lucide-react";

export type Hotel = {
  id: string;
  name?: string;
  address?: string;
  stars?: number;
  photo?: string;
  offer_id?: string;
  price?: number;
  currency?: string;
  base_price?: number;
  base_currency?: string;
  price_breakdown?: { provider_base: number; travsify_markup: number; total: number; currency: string } | null;
};

type Sort = "recommended" | "cheapest" | "rating";

export function HotelResults({
  hotels,
  destinationLabel,
  nights,
  rooms,
  format,
  onSelect,
}: {
  hotels: Hotel[];
  destinationLabel: string;
  nights: number;
  rooms: number;
  format: (amount: number, currency?: string) => string;
  onSelect: (h: Hotel) => void;
}) {
  const [sort, setSort] = useState<Sort>("recommended");
  const [minStars, setMinStars] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const priced = useMemo(() => hotels.filter((h) => typeof h.price === "number" && h.price > 0), [hotels]);

  const priceBounds = useMemo(() => {
    if (!priced.length) return { min: 0, max: 0 };
    const nums = priced.map((h) => Number(h.price));
    return { min: Math.floor(Math.min(...nums)), max: Math.ceil(Math.max(...nums)) };
  }, [priced]);

  const filtered = useMemo(() => {
    let list = priced.filter((h) => (h.stars ?? 0) >= minStars);
    if (maxPrice != null) list = list.filter((h) => Number(h.price) <= maxPrice);
    if (sort === "cheapest") list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "rating") list = [...list].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
    return list;
  }, [priced, minStars, maxPrice, sort]);

  const cheapest = priced.length ? Math.min(...priced.map((h) => Number(h.price))) : 0;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Filter rail */}
      <aside className="space-y-4 rounded-2xl border border-border bg-white p-4 lg:sticky lg:top-24 lg:self-start" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Star rating</h4>
          <div className="mt-2 space-y-1">
            {[5, 4, 3, 0].map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface">
                <input
                  type="radio"
                  name="stars"
                  checked={minStars === s}
                  onChange={() => setMinStars(s)}
                  className="accent-accent"
                />
                {s === 0 ? <span>All ratings</span> : (
                  <span className="flex items-center gap-1">
                    {Array.from({ length: s }).map((_, i) => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
                    <span className="ml-1 text-xs text-muted-foreground">{s}+ stars</span>
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {priceBounds.max > priceBounds.min && (
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max price / night</h4>
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
          onClick={() => { setMinStars(0); setMaxPrice(null); }}
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
              {filtered.length} of {priced.length} stays in <span className="text-accent">{destinationLabel}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {nights} night{nights > 1 ? "s" : ""} · {rooms} room{rooms > 1 ? "s" : ""}
              {priced.length > 0 && <> · from <span className="font-semibold text-foreground">{format(cheapest)}</span></>}
            </p>
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
            No hotels match your filters. Try widening your criteria.
          </div>
        )}

        {filtered.map((h) => (
          <HotelCard key={h.id} hotel={h} nights={nights} format={format} onSelect={() => onSelect(h)} />
        ))}
      </div>
    </div>
  );
}

const AMENITIES = [
  { icon: Wifi, label: "Free Wi-Fi" },
  { icon: Coffee, label: "Breakfast" },
  { icon: Car, label: "Parking" },
  { icon: Waves, label: "Pool" },
  { icon: Dumbbell, label: "Gym" },
];

function HotelCard({
  hotel, nights, format, onSelect,
}: { hotel: Hotel; nights: number; format: (a: number, c?: string) => string; onSelect: () => void }) {
  const total = Number(hotel.price) * nights;
  // Pseudo-stable amenity selection from id hash
  const seed = (hotel.id || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const amenities = AMENITIES.filter((_, i) => (seed >> i) & 1).slice(0, 4);

  return (
    <article className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-white transition hover:border-accent sm:grid-cols-[220px_1fr_180px]" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="relative h-44 bg-surface sm:h-full">
        {hotel.photo ? (
          <img src={hotel.photo} alt={hotel.name || "Hotel"} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start gap-2">
          <h4 className="font-display text-base font-extrabold leading-tight text-primary">{hotel.name || "Hotel"}</h4>
          {!!hotel.stars && (
            <span className="ml-auto inline-flex items-center gap-0.5 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
              {Array.from({ length: Math.round(hotel.stars) }).map((_, i) => <Star key={i} className="h-2.5 w-2.5 fill-accent text-accent" />)}
            </span>
          )}
        </div>
        {hotel.address && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {hotel.address}
          </p>
        )}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {amenities.map((a) => (
              <span key={a.label} className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <a.icon className="h-3 w-3" /> {a.label}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">Free cancellation</span>
          <span>· Pay at booking</span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-2 border-t border-border bg-surface/40 p-4 sm:border-l sm:border-t-0">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">From / night</div>
          <div className="font-display text-2xl font-extrabold text-primary">{format(Number(hotel.price), hotel.currency)}</div>
          <div className="text-[11px] text-muted-foreground">Total {format(total, hotel.currency)} · {nights}n</div>
        </div>
        <button
          onClick={onSelect}
          className="btn-glow w-full rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground transition"
        >
          See availability
        </button>
      </div>
    </article>
  );
}
