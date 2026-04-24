import { Plane, Building2, Car, Globe2, Shield, ArrowRight } from "lucide-react";

const verticals = [
  { icon: Plane, label: "Flights", color: "text-accent" },
  { icon: Building2, label: "Hotels", color: "text-accent" },
  { icon: Car, label: "Transfers", color: "text-primary" },
  { icon: Globe2, label: "e-Visas", color: "text-accent" },
  { icon: Shield, label: "Insurance", color: "text-success" },
];

export function Verticals() {
  return (
    <section id="verticals" className="border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">4</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Travel Verticals</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-center">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            Everything you need.<br />One integration.
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {verticals.map((v) => (
              <a key={v.label} href="#" className="group rounded-xl border border-border bg-white p-5 transition hover:-translate-y-1 hover:shadow-soft" style={{ boxShadow: "var(--shadow-soft)" }}>
                <v.icon className={`h-7 w-7 ${v.color}`} />
                <div className="mt-6 font-display text-base font-bold text-primary">{v.label}</div>
                <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
