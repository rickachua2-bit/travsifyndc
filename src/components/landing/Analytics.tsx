const bullets = ["Revenue analytics", "Booking trends", "Customer insights", "Performance monitoring"];

export function Analytics() {
  return (
    <section className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">8</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Analytics & Insights</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Make smarter decisions with real-time data.
            </h2>
            <ul className="mt-6 space-y-3 text-base text-muted-foreground">
              {bullets.map((b) => <li key={b} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{b}</li>)}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Revenue */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-soft" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="text-xs font-semibold text-muted-foreground">Revenue Overview</div>
              <div className="mt-1 font-display text-2xl font-bold text-primary">$245,680</div>
              <div className="text-xs text-success">↑ 24.5% vs last month</div>
              <svg viewBox="0 0 200 80" className="mt-4 h-24 w-full">
                <defs>
                  <linearGradient id="ar" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.18 45)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="oklch(0.7 0.18 45)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 60 L25 50 L50 55 L75 35 L100 40 L125 25 L150 30 L175 15 L200 20 L200 80 L0 80 Z" fill="url(#ar)" />
                <path d="M0 60 L25 50 L50 55 L75 35 L100 40 L125 25 L150 30 L175 15 L200 20" stroke="oklch(0.7 0.18 45)" strokeWidth="2" fill="none" />
              </svg>
            </div>

            {/* Donut */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-soft" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="text-xs font-semibold text-muted-foreground">Bookings by Status</div>
              <div className="mt-3 flex items-center gap-4">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.92 0.01 255)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.24 0.06 260)" strokeWidth="4" strokeDasharray="68 100" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.7 0.18 45)" strokeWidth="4" strokeDasharray="20 100" strokeDashoffset="-68" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(0.62 0.22 27)" strokeWidth="4" strokeDasharray="12 100" strokeDashoffset="-88" />
                </svg>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Confirmed <span className="ml-auto font-bold">68%</span></div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" /> Pending <span className="ml-auto font-bold">20%</span></div>
                  <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" /> Canceled <span className="ml-auto font-bold">12%</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
