import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type DisplayCurrency = "USD" | "NGN";
export const CURRENCIES: { code: DisplayCurrency; label: string; symbol: string; flag: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
];

type Ctx = {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  format: (amount: number, currency?: string) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "travsify.display_currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>("USD");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "USD" || saved === "NGN") setCurrencyState(saved);
    } catch { /* ignore */ }
  }, []);

  const setCurrency = useCallback((c: DisplayCurrency) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  }, []);

  const format = useCallback((amount: number, ccy?: string) => {
    const code = (ccy || currency).toUpperCase();
    try {
      return new Intl.NumberFormat(code === "NGN" ? "en-NG" : "en-US", {
        style: "currency",
        currency: code,
        maximumFractionDigits: code === "NGN" ? 0 : 2,
      }).format(amount);
    } catch {
      return `${code} ${amount.toLocaleString()}`;
    }
  }, [currency]);

  const value = useMemo<Ctx>(() => ({ currency, setCurrency, format }), [currency, setCurrency, format]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
