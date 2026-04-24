import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Plane, Building2 } from "lucide-react";
import { searchAirports, type Airport } from "@/data/airports";
import { searchCities, type City } from "@/data/cities";
import { FieldLabel } from "@/components/booking/SearchForm";

/**
 * Free-text location autocomplete used for transfers, car rentals, and other
 * verticals where the underlying provider expects a human-readable address
 * rather than a city / IATA code. Suggestions blend airports and cities so
 * users can type "JFK" or "Lagos" and pick a fully-formed address string.
 */
type Suggestion =
  | { kind: "airport"; airport: Airport; label: string; sub: string }
  | { kind: "city"; city: City; label: string; sub: string };

export function LocationInput({
  label,
  value,
  onChange,
  placeholder = "Airport, city, or address",
  required = true,
  iconHint,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  iconHint?: "pickup" | "dropoff";
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value); }, [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo<Suggestion[]>(() => {
    const q = text.trim();
    if (q.length < 2) return [];
    const airports = searchAirports(q, 5).map<Suggestion>((a) => ({
      kind: "airport",
      airport: a,
      label: `${a.name} (${a.code})`,
      sub: `${a.city}, ${a.country}`,
    }));
    const cities = searchCities(q, 5).map<Suggestion>((c) => ({
      kind: "city",
      city: c,
      label: c.city,
      sub: c.country_name,
    }));
    // Airports first — they're more useful for transfers + car rentals
    return [...airports, ...cities].slice(0, 8);
  }, [text]);

  function pick(s: Suggestion) {
    const full =
      s.kind === "airport"
        ? `${s.airport.name} (${s.airport.code}), ${s.airport.city}, ${s.airport.country}`
        : `${s.city.city}, ${s.city.country_name}`;
    setText(full);
    onChange(full);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + matches.length) % matches.length); }
    else if (e.key === "Enter") { e.preventDefault(); pick(matches[highlight]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative mt-1">
        <MapPin className={`pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 ${iconHint === "dropoff" ? "text-accent" : "text-muted-foreground"}`} />
        <input
          type="text"
          value={text}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => { setText(e.target.value); onChange(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-white shadow-lg">
          {matches.map((s, i) => (
            <button
              key={`${s.kind}-${s.kind === "airport" ? s.airport.code : s.city.code}-${i}`}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(s)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${i === highlight ? "bg-surface" : "bg-white"} hover:bg-surface`}
            >
              <span className="flex items-center gap-2 truncate">
                {s.kind === "airport" ? (
                  <Plane className="h-3.5 w-3.5 shrink-0 text-accent" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="truncate">
                  <span className="font-semibold text-foreground">{s.label}</span>
                  <span className="text-muted-foreground">, {s.sub}</span>
                </span>
              </span>
              {s.kind === "airport" && (
                <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">{s.airport.code}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
