import { useMemo, useState } from "react";
import { Plane, ChevronDown, ChevronUp, Briefcase, Luggage, Clock, Filter, X } from "lucide-react";

export type FlightSegment = {
  departing_at?: string;
  arriving_at?: string;
  marketing_carrier?: string;
  flight_number?: string;
  origin?: string;
  destination?: string;
};
export type FlightSlice = {
  origin?: string;
  destination?: string;
  duration?: string;
  segments?: FlightSegment[];
};
export type FlightOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  base_amount: number;
  base_currency: string;
  owner?: string;
  slices?: FlightSlice[];
};

type SortKey = "recommended" | "cheapest" | "fastest";

function fmtTime(iso?: string) {
  if (!iso) return "--:--";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return "--:--"; }
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }
  catch { return ""; }
}
function parseIsoDur(d?: string): number {
  if (!d) return 0;
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}
function fmtDur(mins: number) {
  if (!mins) return "";
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h}h ${m}m`;
}
function offerTotalDuration(o: FlightOffer): number {
  return (o.slices || []).reduce((acc, s) => acc + parseIsoDur(s.duration), 0);
}
function offerStops(o: FlightOffer): number {
  return Math.max(0, ((o.slices?.[0]?.segments?.length || 1) - 1));
}
function offerCarriers(o: FlightOffer): string[] {
  const set = new Set<string>();
  o.slices?.forEach((s) => s.segments?.forEach((seg) => seg.marketing_carrier && set.add(seg.marketing_carrier)));
  return Array.from(set);
}
function offerDepartHour(o: FlightOffer): number {
  const iso = o.slices?.[0]?.segments?.[0]?.departing_at;
  if (!iso) return -1;
  try { return new Date(iso).getHours(); } catch { return -1; }
}

const TIME_BANDS: { id: string; label: string; range: [number, number] }[] = [
  { id: "early", label: "Early morning", range: [0, 6] },
  { id: "morning", label: "Morning", range: [6, 12] },
  { id: "afternoon", label: "Afternoon", range: [12, 18] },
  { id: "evening", label: "Evening", range: [18, 24] },
];

export function FlightResults({
  offers,
  routeLabel,
  onSelect,
  format,
}: {
  offers: FlightOffer[];
  routeLabel: string;
  onSelect: (o: FlightOffer) => void;
  format: (amount: number, currency?: string) => string;
}) {
  const [sort, setSort] = useState<SortKey>("recommended");
  const [stopsFilter, setStopsFilter] = useState<Set<number>>(new Set());
  const [carrierFilter, setCarrierFilter] = useState<Set<string>>(new Set());
  const [bandsFilter, setBandsFilter] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allCarriers = useMemo(() => {
    const c = new Set<string>();
    offers.forEach((o) => offerCarriers(o).forEach((x) => c.add(x)));
    return Array.from(c).sort();
  }, [offers]);

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (stopsFilter.size > 0 && !stopsFilter.has(Math.min(2, offerStops(o)))) return false;
      if (carrierFilter.size > 0 && !offerCarriers(o).some((c) => carrierFilter.has(c))) return false;
      if (bandsFilter.size > 0) {
        const h = offerDepartHour(o);
        const hit = TIME_BANDS.some((b) => bandsFilter.has(b.id) && h >= b.range[0] && h < b.range[1]);
        if (!hit) return false;
      }
      return true;
    });
  }, [offers, stopsFilter, carrierFilter, bandsFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "cheapest") arr.sort((a, b) => Number(a.total_amount) - Number(b.total_amount));
    else if (sort === "fastest") arr.sort((a, b) => offerTotalDuration(a) - offerTotalDuration(b));
    return arr;
  }, [filtered, sort]);

  const cheapest = useMemo(() => offers.reduce<FlightOffer | null>((m, o) => !m || Number(o.total_amount) < Number(m.total_amount) ? o : m, null), [offers]);
  const fastest = useMemo(() => offers.reduce<FlightOffer | null>((m, o) => !m || offerTotalDuration(o) < offerTotalDuration(m) ? o : m, null), [offers]);

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const n = new Set(set);
    if (n.has(value)) n.delete(value); else n.add(value);
    return n;
  }
  function clearAll() {
    setStopsFilter(new Set()); setCarrierFilter(new Set()); setBandsFilter(new Set());
  }
  const activeCount = stopsFilter.size + carrierFilter.size + bandsFilter.size;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Mobile filter toggle */}
      <button onClick={() => setFiltersOpen((v) => !v)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground lg:hidden">
        <Filter className="h-4 w-4" /> Filters {activeCount > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{activeCount}</span>}
      </button>

      {/* Filter rail */}
      <aside className={`${filtersOpen ? "block" : "hidden"} space-y-4 lg:sticky lg:top-4 lg:block lg:self-start`}>
        <div className="rounded-2xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-primary">Filters</h3>
            {activeCount > 0 && (
              <button onClick={clearAll} className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          <FilterGroup title="Stops">
            {[0, 1, 2].map((n) => (
              <CheckRow key={n} checked={stopsFilter.has(n)} onChange={() => setStopsFilter(toggle(stopsFilter, n))}
                label={n === 0 ? "Non-stop" : n === 1 ? "1 stop" : "2+ stops"} />
            ))}
          </FilterGroup>

          <FilterGroup title="Departure time">
            {TIME_BANDS.map((b) => (
              <CheckRow key={b.id} checked={bandsFilter.has(b.id)} onChange={() => setBandsFilter(toggle(bandsFilter, b.id))}
                label={b.label} sub={`${String(b.range[0]).padStart(2, "0")}:00 – ${String(b.range[1]).padStart(2, "0")}:00`} />
            ))}
          </FilterGroup>

          <FilterGroup title={`Airlines (${allCarriers.length})`}>
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {allCarriers.map((c) => (
                <CheckRow key={c} checked={carrierFilter.has(c)} onChange={() => setCarrierFilter(toggle(carrierFilter, c))} label={c} />
              ))}
              {allCarriers.length === 0 && <p className="text-[11px] text-muted-foreground">No data</p>}
            </div>
          </FilterGroup>
        </div>
      </aside>

      {/* Results column */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-extrabold text-primary">Departing for {routeLabel}</h3>
            <p className="text-[11px] text-muted-foreground">{sorted.length} of {offers.length} flights · prices include taxes & service fee</p>
          </div>
        </div>

        {/* Sort tabs */}
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
          <SortTab active={sort === "recommended"} onClick={() => setSort("recommended")} title="Recommended" sub="Best value" price={cheapest ? format(Number(cheapest.total_amount), cheapest.total_currency) : ""} />
          <SortTab active={sort === "cheapest"} onClick={() => setSort("cheapest")} title="Cheapest" sub={cheapest ? fmtDur(offerTotalDuration(cheapest)) : ""} price={cheapest ? format(Number(cheapest.total_amount), cheapest.total_currency) : ""} />
          <SortTab active={sort === "fastest"} onClick={() => setSort("fastest")} title="Fastest" sub={fastest ? fmtDur(offerTotalDuration(fastest)) : ""} price={fastest ? format(Number(fastest.total_amount), fastest.total_currency) : ""} />
        </div>

        {sorted.map((o) => (
          <OfferCard key={o.id} offer={o} format={format} onSelect={() => onSelect(o)} isCheapest={cheapest?.id === o.id} isFastest={fastest?.id === o.id} />
        ))}

        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
            No flights match your filters. <button onClick={clearAll} className="font-semibold text-accent hover:underline">Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 border-t border-border pt-3 first:mt-2 first:border-0 first:pt-0">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckRow({ checked, onChange, label, sub }: { checked: boolean; onChange: () => void; label: string; sub?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent" />
      <span className="flex-1 text-xs text-foreground">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </label>
  );
}

function SortTab({ active, onClick, title, sub, price }: { active: boolean; onClick: () => void; title: string; sub: string; price: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-start gap-0.5 border-b-2 px-4 py-3 text-left transition ${active ? "border-accent bg-accent/5" : "border-transparent hover:bg-surface"}`}>
      <span className={`text-xs font-bold ${active ? "text-accent" : "text-foreground"}`}>{title}</span>
      <span className="text-[11px] text-muted-foreground">{sub}{price && ` · ${price}`}</span>
    </button>
  );
}

function OfferCard({ offer, format, onSelect, isCheapest, isFastest }: { offer: FlightOffer; format: (a: number, c?: string) => string; onSelect: () => void; isCheapest: boolean; isFastest: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-white transition hover:border-accent/50" style={{ boxShadow: "var(--shadow-soft)" }}>
      {(isCheapest || isFastest) && (
        <div className="flex flex-wrap gap-2 border-b border-border bg-surface px-4 py-1.5">
          {isCheapest && <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">CHEAPEST</span>}
          {isFastest && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">FASTEST</span>}
        </div>
      )}
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          {(offer.slices || []).map((s, i) => <SliceRow key={i} slice={s} />)}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> Cabin bag included</span>
            <span className="inline-flex items-center gap-1"><Luggage className="h-3 w-3" /> Checked bag at checkout</span>
            <button onClick={() => setOpen((v) => !v)} className="ml-auto inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              {open ? <>Hide details <ChevronUp className="h-3 w-3" /></> : <>Flight details <ChevronDown className="h-3 w-3" /></>}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 border-l-0 sm:border-l sm:border-border sm:pl-4">
          <div className="font-display text-2xl font-extrabold text-primary">{format(Number(offer.total_amount), offer.total_currency)}</div>
          <div className="text-[10px] text-muted-foreground">per traveller · all-in</div>
          <button onClick={onSelect} className="btn-glow mt-1 rounded-lg bg-accent px-5 py-2 text-xs font-bold text-accent-foreground">Select →</button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-surface/50 p-4">
          {(offer.slices || []).map((s, i) => (
            <div key={i} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Plane className="h-3 w-3" /> {s.origin || "—"} → {s.destination || "—"} · {fmtDur(parseIsoDur(s.duration))}
              </div>
              <ol className="space-y-3 border-l-2 border-border pl-4">
                {(s.segments || []).map((seg, j) => (
                  <li key={j} className="relative">
                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-accent bg-white" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">{fmtTime(seg.departing_at)} <span className="text-muted-foreground">·</span> {seg.origin || ""}</div>
                      <div className="text-[11px] text-muted-foreground">{fmtDate(seg.departing_at)}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{seg.marketing_carrier}{seg.flight_number} · {fmtTime(seg.arriving_at)} arrive {seg.destination || ""}</div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function SliceRow({ slice }: { slice: FlightSlice }) {
  const segs = slice.segments || [];
  const first = segs[0]; const last = segs[segs.length - 1];
  const stops = Math.max(0, segs.length - 1);
  const dur = fmtDur(parseIsoDur(slice.duration));
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <div className="text-right">
        <div className="font-display text-lg font-bold text-primary tabular-nums">{fmtTime(first?.departing_at)}</div>
        <div className="text-[10px] text-muted-foreground">{slice.origin || first?.origin}</div>
      </div>
      <div className="flex flex-col items-center px-1">
        <div className="flex w-full items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
          <span className="h-px flex-1 bg-border" />
          <Plane className="h-3 w-3 -rotate-45 text-muted-foreground" />
          <span className="h-px flex-1 bg-border" />
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
        </div>
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" /> {dur} · {stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
        </div>
      </div>
      <div>
        <div className="font-display text-lg font-bold text-primary tabular-nums">{fmtTime(last?.arriving_at)}</div>
        <div className="text-[10px] text-muted-foreground">{slice.destination || last?.destination}</div>
      </div>
    </div>
  );
}
