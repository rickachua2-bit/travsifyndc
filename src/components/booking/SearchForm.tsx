import type { ReactNode } from "react";
import { Loader2, Search } from "lucide-react";

/** Generic search-form wrapper used by all 6 verticals on /book. */
export function SearchForm({
  busy,
  onSubmit,
  children,
  cta = "Search",
  cols = 4,
}: {
  busy: boolean;
  onSubmit: (form: HTMLFormElement) => void | Promise<void>;
  children: ReactNode;
  cta?: string;
  cols?: 3 | 4 | 5 | 6;
}) {
  const colClass = ({ 3: "sm:grid-cols-3", 4: "sm:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-6" } as const)[cols];
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void onSubmit(e.currentTarget); }}
      className={`grid gap-2 rounded-2xl border border-border bg-white p-4 ${colClass}`}
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {children}
      <button
        disabled={busy}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        {cta}
      </button>
    </form>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{children}</label>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export const inputCls = "w-full rounded-md border border-border bg-white px-2.5 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
