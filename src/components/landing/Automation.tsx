const bullets = ["Flexible markup rules", "Auto pricing engine", "Maximize your margins"];
const rules = [
  { name: "Flights", value: 12 },
  { name: "Hotels", value: 18 },
  { name: "Transfers", value: 15 },
];

export function Automation() {
  return (
    <section className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">14</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Automation & Markups</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Set your profit.<br />We handle the rest.
            </h2>
            <ul className="mt-6 space-y-3 text-base text-muted-foreground">
              {bullets.map((b) => <li key={b} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{b}</li>)}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="mb-4 text-sm font-semibold text-foreground">Markup Rule</div>
            <div className="space-y-5">
              {rules.map((r) => (
                <div key={r.name}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{r.name}</span>
                    <select className="rounded border border-border bg-white px-2 py-0.5 text-xs font-semibold text-primary">
                      <option>{r.value}%</option>
                    </select>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-muted">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${r.value * 4}%` }} />
                    <div className="absolute -top-1 h-3.5 w-3.5 rounded-full border-2 border-accent bg-white shadow-sm" style={{ left: `calc(${r.value * 4}% - 7px)` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
