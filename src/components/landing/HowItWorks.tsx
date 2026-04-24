import { ArrowRight } from "lucide-react";

const steps = [
  { n: 1, title: "Get API Key", desc: "Sign up and get your API credentials.", color: "bg-accent" },
  { n: 2, title: "Integrate", desc: "Integrate our APIs in minutes.", color: "bg-primary" },
  { n: 3, title: "Start Selling", desc: "Go live and start selling instantly.", color: "bg-success" },
];

export function HowItWorks() {
  return (
    <section className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">10</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">How it works</span>
        </div>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Simple steps.<br />Infinite possibilities.
            </h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            {steps.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center">
                <div className="text-center">
                  <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${s.color} font-display text-base font-bold text-white shadow-soft`}>{s.n}</div>
                  <div className="mt-3 font-display text-base font-bold text-primary">{s.title}</div>
                  <div className="mt-1 max-w-[120px] text-xs text-muted-foreground">{s.desc}</div>
                </div>
                {i < steps.length - 1 && <ArrowRight className="mx-2 flex-1 text-accent/40" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
