import { useEffect, useRef, useState } from "react";
import { Calendar, Loader2, Search, Users, Plus, Minus } from "lucide-react";
import { CityInput } from "@/components/booking/CityInput";
import { FieldLabel } from "@/components/booking/SearchForm";
import { CITIES } from "@/data/cities";

export type TourSearchPayload = {
  city_code: string;
  query: string;          // city name passed to GYG `q=`
  destination_label: string;
  date_from: string;      // YYYY-MM-DD
  date_to: string;
  adults: number;
  children: number;
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function TourSearchForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: TourSearchPayload) => void | Promise<void>;
}) {
  const [city, setCity] = useState("");
  const [dateFrom, setDateFrom] = useState(todayPlus(7));
  const [dateTo, setDateTo] = useState(todayPlus(14));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showGuests, setShowGuests] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (guestsRef.current && !guestsRef.current.contains(e.target as Node)) setShowGuests(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!city) { alert("Please choose a destination."); return; }
    if (dateFrom > dateTo) { alert("End date must be after start date."); return; }
    const meta = CITIES.find((c) => c.code === city);
    if (!meta) { alert("Please select a destination from the list."); return; }
    onSubmit({
      city_code: city,
      query: meta.city,
      destination_label: `${meta.city}, ${meta.country_name}`,
      date_from: dateFrom,
      date_to: dateTo,
      adults,
      children,
    });
  }

  const guestSummary = `${adults + children} traveler${adults + children > 1 ? "s" : ""}`;

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-12"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="sm:col-span-5">
        <FieldLabel>Destination</FieldLabel>
        <CityInput value={city} onChange={setCity} placeholder="Where are you going?" />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>From</FieldLabel>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            min={todayPlus(0)}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>To</FieldLabel>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-3" ref={guestsRef}>
        <FieldLabel>Travelers</FieldLabel>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGuests((v) => !v)}
            className="flex h-11 w-full items-center gap-2 rounded-md border border-border bg-white px-3 text-left text-sm"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{guestSummary}</span>
          </button>
          {showGuests && (
            <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-border bg-white p-3 shadow-lg">
              <Stepper label="Adults" sub="13+" value={adults} min={1} max={10} onChange={setAdults} />
              <Stepper label="Children" sub="2–12" value={children} min={0} max={8} onChange={setChildren} />
              <button
                type="button"
                onClick={() => setShowGuests(false)}
                className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sm:col-span-12">
        <button
          type="submit"
          disabled={busy}
          className="btn-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? "Searching experiences…" : "Search tours & activities"}
        </button>
      </div>
    </form>
  );
}

function Stepper({ label, sub, value, min, max, onChange }: { label: string; sub?: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white disabled:opacity-30"><Minus className="h-3 w-3" /></button>
        <span className="w-6 text-center text-sm font-bold">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white disabled:opacity-30"><Plus className="h-3 w-3" /></button>
      </div>
    </div>
  );
}
