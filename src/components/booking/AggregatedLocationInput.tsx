import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { FieldLabel } from "@/components/booking/SearchForm";

export function AggregatedLocationInput({
  label,
  value,
  onChange,
  placeholder = "Select an available city",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/v1/tours/locations");
        const data = await response.json();
        if (data.success) {
          setAvailableLocations(data.locations);
        }
      } catch (err) {
        console.error("Failed to fetch available locations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (q.length === 0 && open) return availableLocations;
    return availableLocations.filter((loc) => 
      loc.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [text, availableLocations, open]);

  function pick(location: string) {
    setText(location);
    onChange(location);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative mt-1">
        <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
        <input
          type="text"
          value={text}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-8 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-white shadow-lg">
          {matches.map((loc, i) => (
            <button
              key={loc}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(loc)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                i === highlight ? "bg-surface" : "bg-white"
              } hover:bg-surface`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="font-medium text-foreground">{loc}</span>
            </button>
          ))}
        </div>
      )}
      {open && matches.length === 0 && !loading && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-white p-3 shadow-lg">
          <p className="text-xs text-muted-foreground">No available cities found. We currently only support specific locations.</p>
        </div>
      )}
    </div>
  );
}
