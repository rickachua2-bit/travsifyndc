import { Briefcase, Rocket, Smartphone, Building } from "lucide-react";

const cases = [
  { icon: Briefcase, title: "Travel Agencies", desc: "Scale your business with global inventory" },
  { icon: Rocket, title: "Startups", desc: "Launch fast with powerful APIs" },
  { icon: Smartphone, title: "Fintech Apps", desc: "Embed travel into your financial apps" },
  { icon: Building, title: "Corporate Travel", desc: "Streamline bookings for your team" },
];

export function UseCases() {
  return (
    <section className="border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">13</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Use Cases</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            Built for every kind of travel business.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cases.map((c) => (
              <div key={c.title} className="rounded-xl border border-border bg-white p-5 shadow-soft transition hover:-translate-y-1" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/5 text-accent">
                  <c.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 font-display text-base font-bold text-primary">{c.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
