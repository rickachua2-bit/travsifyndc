import { useEffect, useRef, useState } from "react";
import { Calendar, Loader2, Search, Users, Plus, Minus } from "lucide-react";
import { CityInput } from "@/components/booking/CityInput";
import { FieldLabel } from "@/components/booking/SearchForm";
import { CITIES } from "@/data/cities";

export type HotelSearchPayload = {
  city_code: string;
  city_name: string;
  country_code: string;
  checkin: string;
  checkout: string;
  rooms: number;
  adults: number;
  children: number;
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function HotelSearchForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: HotelSearchPayload) => void | Promise<void>;
}) {
  const [city, setCity] = useState("");
  const [checkin, setCheckin] = useState(todayPlus(7));
  const [checkout, setCheckout] = useState(todayPlus(9));
  const [rooms, setRooms] = useState(1);
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
    if (checkin >= checkout) { alert("Check-out must be after check-in."); return; }
    const meta = CITIES.find((c) => c.code === city);
    if (!meta) { alert("Please select a destination from the list."); return; }
    onSubmit({
      city_code: city,
      city_name: meta.city,
      country_code: meta.country,
      checkin, checkout, rooms, adults, children,
    });
  }

  const guestSummary = `${rooms} room${rooms > 1 ? "s" : ""} · ${adults + children} guest${adults + children > 1 ? "s" : ""}`;

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-12"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="sm:col-span-4">
        <CityInput label="Destination" value={city} onChange={setCity} />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Check-in</FieldLabel>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            required
            min={todayPlus(0)}
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className="w-full rounded-md border border-border bg-white pl-7 pr-2 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Check-out</FieldLabel>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            required
            min={checkin}
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className="w-full rounded-md border border-border bg-white pl-7 pr-2 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div ref={guestsRef} className="relative sm:col-span-2">
        <FieldLabel>Rooms & guests</FieldLabel>
        <button
          type="button"
          onClick={() => setShowGuests((s) => !s)}
          className="mt-1 flex w-full items-center gap-2 rounded-md border border-border bg-white px-2.5 py-2 text-left text-sm hover:border-accent"
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{guestSummary}</span>
        </button>
        {showGuests && (
          <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-border bg-white p-4 shadow-lg">
            <Stepper label="Rooms" value={rooms} min={1} max={8} onChange={setRooms} />
            <Stepper label="Adults" sub="Age 18+" value={adults} min={1} max={16} onChange={setAdults} />
            <Stepper label="Children" sub="Age 0–17" value={children} min={0} max={8} onChange={setChildren} />
            <button
              type="button"
              onClick={() => setShowGuests(false)}
              className="mt-2 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <div className="sm:col-span-2 flex items-end">
        <button
          disabled={busy}
          className="btn-glow inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2.5 text-sm font-bold text-accent-foreground transition disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>
    </form>
  );
}

function Stepper({
  label, sub, value, min, max, onChange,
}: { label: string; sub?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white disabled:opacity-30">
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-5 text-center text-sm font-bold">{value}</span>
        <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white disabled:opacity-30">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
