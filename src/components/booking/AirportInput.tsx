import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Plane } from "lucide-react";
import { searchAirports, findAirport, type Airport } from "@/data/airports";

/**
 * Airport / city autocomplete input.
 * - Value is always the IATA code (uppercase). Display shows "City (CODE) — Airport".
 * - Keyboard: ↑ ↓ Enter Esc supported.
 * - When the user types 3 letters that match an exact IATA code, it auto-resolves.
 */
export function AirportInput({
  label,
  value,
  onChange,
  placeholder = "City or airport",
  exclude,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  /** IATA code to exclude from suggestions (e.g. the other end of the trip). */
  exclude?: string;
}) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => (value ? findAirport(value) : undefined), [value]);
  const [query, setQuery] = useState<string>(() => (selected ? `${selected.city} (${selected.code})` : value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Sync external value changes (e.g. swap button) into the visible query.
  useEffect(() => {
    if (selected) setQuery(`${selected.city} (${selected.code})`);
    else if (!value) setQuery("");
  }, [value, selected]);

  // Outside click closes the dropdown.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo<Airport[]>(() => {
    const list = searchAirports(query, 10);
    return exclude ? list.filter((a) => a.code !== exclude.toUpperCase()) : list;
  }, [query, exclude]);

  function pick(a: Airport) {
    onChange(a.code);
    setQuery(`${a.city} (${a.code})`);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative mt-1">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            setActive(0);
            // Auto-resolve if user types/pastes a valid 3-letter IATA code.
            const match = v.trim().toUpperCase();
            if (/^[A-Z]{3}$/.test(match)) {
              const a = findAirport(match);
              if (a) onChange(a.code);
              else onChange("");
            } else {
              // Clear selection while user is typing free-text.
              if (value) onChange("");
            }
          }}
          onFocus={() => { setOpen(true); setActive(0); }}
          onKeyDown={onKeyDown}
          required
          className="w-full rounded-md border border-border bg-white py-2 pl-8 pr-12 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {selected && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {selected.code}
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-lg"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          {results.map((a, i) => (
            <li key={a.code}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(a); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
                  i === active ? "bg-accent/10" : "hover:bg-surface"
                }`}
              >
                <Plane className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">
                    {a.city}, {a.country}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">{a.name}</div>
                </div>
                <span className="flex-none rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">{a.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-lg border border-border bg-white p-3 text-xs text-muted-foreground shadow-lg">
          No airports match "{query}". Try a city name or 3-letter IATA code.
        </div>
      )}
    </div>
  );
}
