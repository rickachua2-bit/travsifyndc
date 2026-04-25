import { useMemo, useState } from "react";
import { Car, Users, Briefcase, Snowflake, Settings, ShieldCheck, Fuel, MapPin, Sparkles, TrendingDown } from "lucide-react";

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

type Sort = "cheapest" | "biggest" | "recommended";

const CLASSES: Array<{ id: CarRentalQuote["car_class"]; label: string }> = [
  { id: "economy", label: "Economy" },
  { id: "compact", label: "Compact" },
  { id: "midsize", label: "Midsize" },
  { id: "suv", label: "SUV" },
  { id: "premium", label: "Premium" },
  { id: "minivan", label: "Minivan" },
];

/** Match the car's example_model to a representative Unsplash photo of that
 *  exact make/model so the image and the listing title agree. Falls back to a
 *  class-level photo when we don't have a model-specific shot. */
const MODEL_PHOTOS: Array<{ match: RegExp; url: string }> = [
  // Economy
  { match: /kia rio/i,         url: "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=400&h=260&fit=crop" },
  { match: /hyundai i10/i,     url: "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=400&h=260&fit=crop" },
  { match: /fiat panda/i,      url: "https://images.unsplash.com/photo-1612825173281-9a193378527e?w=400&h=260&fit=crop" },
  { match: /chevrolet spark/i, url: "https://images.unsplash.com/photo-1570733577524-3a047079e80d?w=400&h=260&fit=crop" },

  // Compact
  { match: /toyota corolla/i,    url: "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=400&h=260&fit=crop" },
  { match: /volkswagen golf|vw golf/i, url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=260&fit=crop" },
  { match: /ford focus/i,        url: "https://images.unsplash.com/photo-1612544448445-b8232cff3b6c?w=400&h=260&fit=crop" },
  { match: /mazda 3/i,           url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=260&fit=crop" },

  // Midsize
  { match: /hyundai sonata/i,       url: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=260&fit=crop" },
  { match: /toyota camry/i,         url: "https://images.unsplash.com/photo-1621135802920-133df287f89c?w=400&h=260&fit=crop" },
  { match: /volkswagen passat|vw passat/i, url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=260&fit=crop" },
  { match: /nissan altima/i,        url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&h=260&fit=crop" },

  // SUV
  { match: /toyota rav4/i,    url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=260&fit=crop" },
  { match: /nissan rogue/i,   url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&h=260&fit=crop" },
  { match: /jeep compass/i,   url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=260&fit=crop" },
  { match: /kia sportage/i,   url: "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=400&h=260&fit=crop" },

  // Premium
  { match: /mercedes.+e.?class/i, url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=260&fit=crop" },
  { match: /bmw 5 series/i,       url: "https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=400&h=260&fit=crop" },
  { match: /audi a6/i,            url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=260&fit=crop" },
  { match: /volvo s90/i,          url: "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=400&h=260&fit=crop" },

  // Minivan
  { match: /chrysler pacifica/i, url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=260&fit=crop" },
  { match: /honda odyssey/i,     url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=260&fit=crop" },
  { match: /toyota sienna/i,     url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=260&fit=crop" },
  { match: /kia carnival/i,      url: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=260&fit=crop" },
];

const CLASS_FALLBACK_PHOTO: Record<CarRentalQuote["car_class"], string> = {
  economy:  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=260&fit=crop",
  compact:  "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&h=260&fit=crop",
  midsize:  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=260&fit=crop",
  suv:      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=260&fit=crop",
  premium:  "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=260&fit=crop",
  minivan:  "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=260&fit=crop",
};

function carPhoto(model: string, cls: CarRentalQuote["car_class"]): string {
  for (const m of MODEL_PHOTOS) if (m.match.test(model)) return m.url;
  return CLASS_FALLBACK_PHOTO[cls];
}

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
  const [sort, setSort] = useState<Sort>("recommended");
  const [classes, setClasses] = useState<Set<CarRentalQuote["car_class"]>>(new Set());
  const [transmission, setTransmission] = useState<"all" | "automatic" | "manual">("all");
  const [acOnly, setAcOnly] = useState(false);
  const [unlimitedOnly, setUnlimitedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const priceBounds = useMemo(() => {
    if (!quotes.length) return { min: 0, max: 0 };
    const nums = quotes.map((q) => q.total_price);
    return { min: Math.floor(Math.min(...nums)), max: Math.ceil(Math.max(...nums)) };
  }, [quotes]);

  const median = useMemo(() => {
    if (!quotes.length) return 0;
    const arr = [...quotes.map((q) => q.total_price)].sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)];
  }, [quotes]);

  const filtered = useMemo(() => {
    let list = quotes;
    if (classes.size > 0) list = list.filter((q) => classes.has(q.car_class));
    if (transmission !== "all") list = list.filter((q) => q.transmission === transmission);
    if (acOnly) list = list.filter((q) => q.air_conditioning);
    if (unlimitedOnly) list = list.filter((q) => q.unlimited_mileage);
    if (maxPrice != null) list = list.filter((q) => q.total_price <= maxPrice);

    if (sort === "cheapest") list = [...list].sort((a, b) => a.total_price - b.total_price);
    else if (sort === "biggest") list = [...list].sort((a, b) => b.passengers - a.passengers || b.bags - a.bags);
    else list = [...list].sort((a, b) => {
      // recommended = balance price + capacity
      const score = (q: CarRentalQuote) => q.total_price - q.passengers * 8 - q.bags * 4;
      return score(a) - score(b);
    });
    return list;
  }, [quotes, classes, transmission, acOnly, unlimitedOnly, maxPrice, sort]);

  const cheapest = quotes.length ? Math.min(...quotes.map((q) => q.total_price)) : 0;
  const classCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of quotes) m.set(q.car_class, (m.get(q.car_class) ?? 0) + 1);
    return m;
  }, [quotes]);

  const toggleClass = (id: CarRentalQuote["car_class"]) => {
    setClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Kayak-style filter rail */}
      <aside className="space-y-4 rounded-2xl border border-border bg-white p-4 lg:sticky lg:top-24 lg:self-start" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-extrabold text-primary">Filter</h3>
          <button
            type="button"
            onClick={() => { setClasses(new Set()); setTransmission("all"); setAcOnly(false); setUnlimitedOnly(false); setMaxPrice(null); }}
            className="text-[11px] font-semibold text-accent hover:underline"
          >
            Reset
          </button>
        </div>

        {priceBounds.max > priceBounds.min && (
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total price</h4>
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

        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Car type</h4>
          <div className="mt-2 space-y-1">
            {CLASSES.map((c) => {
              const count = classCounts.get(c.id) ?? 0;
              if (count === 0) return null;
              return (
                <label key={c.id} className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-surface">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={classes.has(c.id)}
                      onChange={() => toggleClass(c.id)}
                      className="accent-accent"
                    />
                    <span>{c.label}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transmission</h4>
          <div className="mt-2 space-y-1">
            {(["all", "automatic", "manual"] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface">
                <input type="radio" name="trans" checked={transmission === t} onChange={() => setTransmission(t)} className="accent-accent" />
                <span className="capitalize">{t === "all" ? "Any transmission" : t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Features</h4>
          <div className="mt-2 space-y-1">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface">
              <input type="checkbox" checked={acOnly} onChange={(e) => setAcOnly(e.target.checked)} className="accent-accent" />
              <Snowflake className="h-3 w-3" /> Air conditioning
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface">
              <input type="checkbox" checked={unlimitedOnly} onChange={(e) => setUnlimitedOnly(e.target.checked)} className="accent-accent" />
              <Fuel className="h-3 w-3" /> Unlimited mileage
            </label>
          </div>
        </div>
      </aside>

      {/* Results column */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-border bg-white p-3">
          <div>
            <h3 className="font-display text-lg font-extrabold text-primary">
              {filtered.length} of {quotes.length} cars for <span className="text-accent">{routeLabel}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              From <span className="font-semibold text-foreground">{format(cheapest)}</span> total · all taxes included
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Curated from leading rental partners · ops-confirmed within hours
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["recommended", "cheapest", "biggest"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
                  sort === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface"
                }`}
              >
                {s === "biggest" ? "Biggest" : s === "cheapest" ? "Cheapest" : "Best"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            No cars match these filters. Try widening your criteria.
          </div>
        )}

        {filtered.map((q) => {
          const isGoodDeal = median > 0 && q.total_price < median * 0.92;
          return (
            <article
              key={q.id}
              className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-white transition hover:border-accent sm:grid-cols-[200px_1fr_180px]"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="relative h-40 bg-surface sm:h-full">
                <img
                  src={carPhoto(q.car_class)}
                  alt={q.car_description}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {isGoodDeal && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                    <TrendingDown className="h-3 w-3" /> Great deal
                  </span>
                )}
                <span className="absolute bottom-2 left-2 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  {q.car_class}
                </span>
              </div>

              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-base font-extrabold leading-tight text-primary">{q.example_model}</h4>
                  <span className="text-[11px] text-muted-foreground">or similar</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {q.passengers}</span>
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {q.bags}</span>
                  <span className="inline-flex items-center gap-1"><Settings className="h-3 w-3" /> {q.transmission}</span>
                  {q.air_conditioning && <span className="inline-flex items-center gap-1"><Snowflake className="h-3 w-3" /> A/C</span>}
                  {q.unlimited_mileage && <span className="inline-flex items-center gap-1"><Fuel className="h-3 w-3" /> Unlimited km</span>}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                    <ShieldCheck className="h-3 w-3" /> {q.cancellation_policy}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-primary/5 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                    <Sparkles className="h-3 w-3" /> Pay at pickup option
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 pt-1">
                  <MapPin className="h-3 w-3" /> Pickup at {q.pickup_location}
                  {q.pickup_location !== q.dropoff_location && <> · drop-off {q.dropoff_location}</>}
                </p>
              </div>

              <div className="flex flex-col items-end justify-between gap-2 border-t border-border bg-surface/40 p-4 sm:border-l sm:border-t-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{q.rental_days} day{q.rental_days > 1 ? "s" : ""} total</div>
                  <div className="font-display text-2xl font-extrabold text-primary">{format(q.total_price, q.currency)}</div>
                  <div className="text-[11px] text-muted-foreground">{format(q.per_day_price, q.currency)} / day</div>
                </div>
                <button
                  onClick={() => onSelect(q)}
                  className="btn-glow w-full rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
                >
                  View deal
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
