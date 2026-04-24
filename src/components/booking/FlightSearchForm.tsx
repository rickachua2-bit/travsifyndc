import { useState, useMemo } from "react";
import { ArrowLeftRight, Loader2, Plane, Plus, Search, Trash2, Users, Briefcase, ShieldCheck, Clock, Sparkles } from "lucide-react";

export type TripType = "oneway" | "roundtrip" | "multicity";
export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export type FlightSearchPayload = {
  trip_type: TripType;
  cabin: CabinClass;
  adults: number;
  children: number;
  infants: number;
  slices: Array<{ origin: string; destination: string; departure_date: string }>;
  return_date?: string;
};

const CABINS: { id: CabinClass; label: string }[] = [
  { id: "economy", label: "Economy" },
  { id: "premium_economy", label: "Premium Economy" },
  { id: "business", label: "Business" },
  { id: "first", label: "First" },
];

const PERKS = [
  { icon: Plane, title: "500+ airlines", desc: "Real NDC inventory, single source of truth." },
  { icon: ShieldCheck, title: "Instant ticketing", desc: "PNR + e-ticket emailed in seconds." },
  { icon: Briefcase, title: "Bag & seat add-ons", desc: "Ancillaries available at checkout." },
  { icon: Clock, title: "24h hold + free cancel*", desc: "On supported fare brands." },
];

export function FlightSearchForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: FlightSearchPayload) => void | Promise<void>;
}) {
  const [trip, setTrip] = useState<TripType>("roundtrip");
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [paxOpen, setPaxOpen] = useState(false);

  // Slice 0 always exists; round-trip uses returnDate; multi-city adds extra slices.
  const [slices, setSlices] = useState<Array<{ origin: string; destination: string; departure_date: string }>>([
    { origin: "", destination: "", departure_date: "" },
  ]);
  const [returnDate, setReturnDate] = useState("");

  const totalPax = adults + children + infants;
  const cabinLabel = useMemo(() => CABINS.find((c) => c.id === cabin)?.label ?? "Economy", [cabin]);

  function updateSlice(i: number, key: "origin" | "destination" | "departure_date", value: string) {
    setSlices((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: key === "departure_date" ? value : value.toUpperCase() } : s)));
  }

  function swap(i: number) {
    setSlices((prev) => prev.map((s, idx) => (idx === i ? { ...s, origin: s.destination, destination: s.origin } : s)));
  }

  function addSlice() {
    if (slices.length >= 6) return;
    const last = slices[slices.length - 1];
    setSlices((prev) => [...prev, { origin: last?.destination || "", destination: "", departure_date: "" }]);
  }

  function removeSlice(i: number) {
    setSlices((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function changeTrip(t: TripType) {
    setTrip(t);
    if (t !== "multicity" && slices.length > 1) {
      setSlices((prev) => [prev[0]]);
    }
    if (t === "multicity" && slices.length === 1) {
      const last = slices[0];
      setSlices((prev) => [...prev, { origin: last.destination || "", destination: "", departure_date: "" }]);
    }
    if (t !== "roundtrip") setReturnDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (infants > adults) {
      alert("Each infant must travel with an adult.");
      return;
    }
    const cleanSlices = slices.map((s) => ({
      origin: s.origin.trim().toUpperCase(),
      destination: s.destination.trim().toUpperCase(),
      departure_date: s.departure_date,
    }));
    const IATA = /^[A-Z]{3}$/;
    const bad = cleanSlices.find((s) => !IATA.test(s.origin) || !IATA.test(s.destination) || !s.departure_date);
    if (bad) {
      alert(`Please enter valid 3-letter IATA airport codes for every leg (e.g. LOS, DXB, LHR). Got "${bad.origin}" → "${bad.destination}".`);
      return;
    }
    if (cleanSlices.some((s) => s.origin === s.destination)) {
      alert("Origin and destination must be different airports.");
      return;
    }
    void onSubmit({
      trip_type: trip,
      cabin,
      adults,
      children,
      infants,
      slices: cleanSlices,
      return_date: trip === "roundtrip" ? returnDate || undefined : undefined,
    });
  }

  return (
    <div className="space-y-4">
      {/* Hero strip — perks */}
      <div className="grid gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-white to-accent/5 p-4 sm:grid-cols-4">
        {PERKS.map((p) => (
          <div key={p.title} className="flex items-start gap-2">
            <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent/15 text-accent">
              <p.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-primary">{p.title}</div>
              <div className="text-[11px] leading-tight text-muted-foreground">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-4 sm:p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
        {/* Trip type + passenger + cabin pickers */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="inline-flex rounded-xl bg-surface p-1">
            {(["oneway", "roundtrip", "multicity"] as TripType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => changeTrip(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  trip === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "oneway" ? "One-way" : t === "roundtrip" ? "Round-trip" : "Multi-city"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PassengerPopover
              open={paxOpen}
              onToggle={() => setPaxOpen((v) => !v)}
              adults={adults}
              children={children}
              infants={infants}
              onChange={(a, c, i) => {
                setAdults(a);
                setChildren(c);
                setInfants(i);
              }}
              total={totalPax}
            />
            <div className="relative">
              <select
                value={cabin}
                onChange={(e) => setCabin(e.target.value as CabinClass)}
                className="appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-8 text-xs font-semibold text-foreground hover:border-accent focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label="Cabin class"
              >
                {CABINS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <Sparkles className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Slices */}
        <div className="mt-3 space-y-3">
          {slices.map((s, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_1fr_auto]">
              <Input label={i === 0 ? "From (IATA)" : `From Leg ${i + 1} (IATA)`} value={s.origin} onChange={(v) => updateSlice(i, "origin", v)} placeholder="LOS" maxLength={3} uppercase pattern="[A-Za-z]{3}" title="3-letter airport code, e.g. LOS, DXB, LHR" />
              <button type="button" onClick={() => swap(i)} className="mt-5 hidden h-9 w-9 items-center justify-center self-end rounded-md border border-border text-muted-foreground hover:border-accent hover:text-accent sm:inline-flex" aria-label="Swap origin and destination">
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
              <Input label="To (IATA)" value={s.destination} onChange={(v) => updateSlice(i, "destination", v)} placeholder="DXB" maxLength={3} uppercase pattern="[A-Za-z]{3}" title="3-letter airport code, e.g. LOS, DXB, LHR" />
              <Input label="Departure" type="date" value={s.departure_date} onChange={(v) => updateSlice(i, "departure_date", v)} />
              {trip === "multicity" && slices.length > 1 ? (
                <button type="button" onClick={() => removeSlice(i)} className="mt-5 inline-flex h-9 w-9 items-center justify-center self-end rounded-md border border-border text-destructive hover:border-destructive" aria-label="Remove leg">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : <div className="hidden sm:block" />}
            </div>
          ))}

          {trip === "roundtrip" && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_1fr_auto]">
              <div className="sm:col-start-4">
                <Input label="Return" type="date" value={returnDate} onChange={setReturnDate} />
              </div>
            </div>
          )}

          {trip === "multicity" && slices.length < 6 && (
            <button type="button" onClick={addSlice} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-accent/50 bg-accent/5 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/10">
              <Plus className="h-3.5 w-3.5" /> Add another leg
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{totalPax} traveller{totalPax === 1 ? "" : "s"}</span> · {cabinLabel} · prices include all taxes & our service fee.
          </div>
          <button
            type="submit"
            disabled={busy}
            className="btn-glow inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition hover:opacity-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search flights
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  uppercase,
  pattern,
  title,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  maxLength?: number;
  uppercase?: boolean;
  pattern?: string;
  title?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        pattern={pattern}
        title={title}
        required
        className={`mt-1 w-full rounded-md border border-border bg-white px-2.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${uppercase ? "uppercase" : ""}`}
      />
    </label>
  );
}

function PassengerPopover({
  open,
  onToggle,
  adults,
  children,
  infants,
  onChange,
  total,
}: {
  open: boolean;
  onToggle: () => void;
  adults: number;
  children: number;
  infants: number;
  onChange: (a: number, c: number, i: number) => void;
  total: number;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Users className="h-3.5 w-3.5" />
        {total} traveller{total === 1 ? "" : "s"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-white p-3 shadow-lg" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <PaxRow
            title="Adults"
            sub="12 years and over"
            value={adults}
            min={1}
            max={9}
            onChange={(v) => onChange(v, children, infants)}
          />
          <PaxRow
            title="Children"
            sub="2 – 11 years"
            value={children}
            min={0}
            max={8}
            onChange={(v) => onChange(adults, v, infants)}
          />
          <PaxRow
            title="Infants"
            sub="Under 2 (on lap)"
            value={infants}
            min={0}
            max={Math.min(4, adults)}
            onChange={(v) => onChange(adults, children, v)}
          />
          <p className="mt-2 text-[10px] leading-tight text-muted-foreground">Each infant must be accompanied by an adult. Maximum 9 seated passengers per booking.</p>
          <button type="button" onClick={onToggle} className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Done</button>
        </div>
      )}
    </div>
  );
}

function PaxRow({ title, sub, value, min, max, onChange }: { title: string; sub: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <div className="inline-flex items-center gap-2">
        <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} className="h-7 w-7 rounded-md border border-border text-foreground disabled:opacity-30">−</button>
        <span className="w-5 text-center text-sm font-bold tabular-nums">{value}</span>
        <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} className="h-7 w-7 rounded-md border border-border text-foreground disabled:opacity-30">+</button>
      </div>
    </div>
  );
}
