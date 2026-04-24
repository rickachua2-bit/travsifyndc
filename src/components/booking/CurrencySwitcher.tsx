import { useCurrency, CURRENCIES, type DisplayCurrency } from "@/hooks/useCurrency";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

/**
 * Compact currency picker for the booking page.
 * Persists choice in localStorage. All search/checkout calls read from CurrencyContext.
 */
export function CurrencySwitcher({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = CURRENCIES.find((c) => c.code === currency)!;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Display currency"
      >
        <span aria-hidden>{active.flag}</span>
        <span>{active.code}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          {CURRENCIES.map((c) => {
            const selected = c.code === currency;
            return (
              <li key={c.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => { setCurrency(c.code as DisplayCurrency); setOpen(false); }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-surface ${selected ? "font-bold text-primary" : "text-foreground"}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden>{c.flag}</span>
                    <span>{c.code}</span>
                    <span className="text-muted-foreground">· {c.label}</span>
                  </span>
                  {selected && <span aria-hidden className="text-accent">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
