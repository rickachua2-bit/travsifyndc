const tabs = ["Flights", "Hotels", "Transfers", "e-Visas", "Insurance"];
const bullets = ["Smart search", "Live availability", "Real-time pricing", "Book & issue instantly"];
const flights = [
  { air: "Emirates", route: "LOS → DXB", time: "08:45 - 18:30", price: "$450" },
  { air: "Qatar Airways", route: "LOS → DXB", time: "07:20 - 17:10", price: "$470" },
  { air: "Turkish Airlines", route: "LOS → DXB", time: "09:15 - 19:40", price: "$480" },
];

export function GlobalTerminal() {
  return (
    <section className="border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">7</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Global Terminal</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Control your entire<br />travel operation in<br />one place.
            </h2>
            <ul className="mt-6 space-y-3 text-base text-muted-foreground">
              {bullets.map((b) => <li key={b} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{b}</li>)}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="flex border-b border-border">
              {tabs.map((t, i) => (
                <button key={t} className={`px-3 py-2 text-xs font-medium ${i === 0 ? "border-b-2 border-accent text-primary" : "text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
              {[
                ["From", "Lagos (LOS)"], ["To", "Dubai (DXB)"], ["Depart", "20 May 2024"], ["Return", "27 May 2024"], ["Travelers", "1 Passenger"],
              ].map(([l, v]) => (
                <div key={l} className="rounded border border-border p-2">
                  <div className="text-[9px] uppercase text-muted-foreground">{l}</div>
                  <div className="mt-0.5 font-medium text-foreground">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end"><button className="rounded bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground">Search</button></div>

            <div className="mt-6 mb-2 text-xs font-semibold text-foreground">Best Options</div>
            <div className="space-y-2">
              {flights.map((f) => (
                <div key={f.air} className="flex items-center justify-between rounded-lg border border-border p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent/10" />
                    <span className="font-semibold text-primary">{f.air}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{f.route}</span>
                  <span className="text-muted-foreground">{f.time}</span>
                  <span className="font-display font-bold text-primary">{f.price}</span>
                  <button className="rounded bg-accent px-3 py-1 text-[10px] font-semibold text-accent-foreground">Book</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
