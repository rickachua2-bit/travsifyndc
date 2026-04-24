import { useState } from "react";
import { Calendar, Loader2, Search, Globe2, UserPlus, Trash2 } from "lucide-react";
import { FieldLabel } from "@/components/booking/SearchForm";

export type InsuranceSearchPayload = {
  nationality: string;
  nationality_name: string;
  destination: string;
  destination_name: string;
  start_date: string;
  end_date: string;
  travelers: { age: number }[];
  coverage_type: "nomad" | "trip" | "remote_health";
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Compact common-country list — enough for an MVP picker.
const COUNTRIES: { code: string; name: string }[] = [
  { code: "WW", name: "Worldwide" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "GH", name: "Ghana" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "PT", name: "Portugal" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "TR", name: "Türkiye" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "IN", name: "India" },
  { code: "TH", name: "Thailand" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "JP", name: "Japan" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
];

export function InsuranceSearchForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: InsuranceSearchPayload) => void | Promise<void>;
}) {
  const [nationality, setNationality] = useState("NG");
  const [destination, setDestination] = useState("WW");
  const [startDate, setStartDate] = useState(todayPlus(7));
  const [endDate, setEndDate] = useState(todayPlus(35));
  const [coverage, setCoverage] = useState<"nomad" | "trip" | "remote_health">("nomad");
  const [ages, setAges] = useState<number[]>([30]);

  function updateAge(i: number, v: number) {
    setAges((prev) => prev.map((a, idx) => (idx === i ? Math.max(0, Math.min(99, v)) : a)));
  }
  function addTraveler() {
    if (ages.length >= 10) return;
    setAges((prev) => [...prev, 30]);
  }
  function removeTraveler(i: number) {
    if (ages.length <= 1) return;
    setAges((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nationality || !destination) { alert("Please select nationality and destination."); return; }
    if (startDate >= endDate) { alert("End date must be after start date."); return; }
    if (ages.some((a) => Number.isNaN(a))) { alert("Enter a valid age for every traveler."); return; }
    const nat = COUNTRIES.find((c) => c.code === nationality);
    const dest = COUNTRIES.find((c) => c.code === destination);
    onSubmit({
      nationality,
      nationality_name: nat?.name ?? nationality,
      destination,
      destination_name: dest?.name ?? destination,
      start_date: startDate,
      end_date: endDate,
      travelers: ages.map((age) => ({ age })),
      coverage_type: coverage,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-12"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="sm:col-span-3">
        <FieldLabel>Nationality</FieldLabel>
        <div className="relative mt-1">
          <Globe2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
          >
            {COUNTRIES.filter((c) => c.code !== "WW").map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sm:col-span-3">
        <FieldLabel>Destination</FieldLabel>
        <div className="relative mt-1">
          <Globe2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Start date</FieldLabel>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={startDate}
            min={todayPlus(0)}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>End date</FieldLabel>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Coverage</FieldLabel>
        <select
          value={coverage}
          onChange={(e) => setCoverage(e.target.value as typeof coverage)}
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-2 text-sm"
        >
          <option value="nomad">Nomad insurance</option>
          <option value="trip">Trip insurance</option>
          <option value="remote_health">Remote health</option>
        </select>
      </div>

      <div className="sm:col-span-12">
        <FieldLabel>Travelers · enter age of each person</FieldLabel>
        <div className="mt-1 flex flex-wrap gap-2">
          {ages.map((age, i) => (
            <div key={i} className="flex items-center gap-1 rounded-md border border-border bg-white pl-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#{i + 1}</span>
              <input
                type="number"
                value={age}
                min={0}
                max={99}
                onChange={(e) => updateAge(i, Number(e.target.value))}
                className="h-9 w-16 border-0 bg-transparent text-sm focus:outline-none"
              />
              {ages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTraveler(i)}
                  className="px-1.5 py-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove traveler"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {ages.length < 10 && (
            <button
              type="button"
              onClick={addTraveler}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-white px-2 py-1 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent"
            >
              <UserPlus className="h-3 w-3" /> Add traveler
            </button>
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
          {busy ? "Pricing your cover…" : "Get insurance quote"}
        </button>
      </div>
    </form>
  );
}
