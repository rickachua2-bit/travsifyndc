import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { searchCities, findCityByCode, type City } from "@/data/cities";
import { FieldLabel } from "@/components/booking/SearchForm";

/**
 * City autocomplete for hotel destinations.
 * Stores LiteAPI cityCode (3-letter) as the value, displays "City, Country".
 */
export function CityInput({
  label,
  value,
  onChange,
  placeholder = "City or country (e.g. Lagos, Dubai)",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync text when value changes externally
  useEffect(() => {
    const c = findCityByCode(value);
    if (c) setText(`${c.city}, ${c.country_name}`);
    else if (!value) setText("");
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo(() => searchCities(text, 8), [text]);

  function pick(c: City) {
    onChange(c.code);
    setText(`${c.city}, ${c.country_name}`);
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
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={text}
          required={required}
          placeholder={placeholder}
          onChange={(e) => { setText(e.target.value); setOpen(true); setHighlight(0); if (!e.target.value) onChange(""); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="w-full rounded-md border border-border bg-white pl-7 pr-2.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-white shadow-lg">
          {matches.map((c, i) => (
            <button
              key={c.code}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(c)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                i === highlight ? "bg-surface" : "bg-white"
              } hover:bg-surface`}
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="truncate">
                  <span className="font-semibold text-foreground">{c.city}</span>
                  <span className="text-muted-foreground">, {c.country_name}</span>
                </span>
              </span>
              <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
