export function DashboardMock() {
  return (
    <div className="relative">
      {/* World map dots backdrop */}
      <svg viewBox="0 0 600 380" className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden>
        {Array.from({ length: 280 }).map((_, i) => {
          const x = (i * 37) % 600;
          const y = (i * 53) % 380;
          return <circle key={i} cx={x} cy={y} r="1.5" fill="currentColor" className="text-primary" />;
        })}
      </svg>

      {/* Plane + dashed route */}
      <svg viewBox="0 0 600 200" className="absolute -top-8 left-0 h-32 w-full" aria-hidden>
        <path d="M40 160 Q 300 -20 560 140" stroke="oklch(0.7 0.18 45)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
        <g transform="translate(290 30) rotate(15)">
          <path d="M0 0 L24 8 L20 12 L8 10 L4 18 L0 16 L2 8 L-4 6 Z" fill="oklch(0.24 0.06 260)" />
        </g>
      </svg>

      {/* Laptop */}
      <div className="relative ml-auto w-full max-w-xl">
        <div className="rounded-t-xl bg-primary p-2 shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
          <div className="rounded-md bg-white p-3">
            {/* topbar */}
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-destructive/60" />
                <div className="h-2 w-2 rounded-full bg-accent/60" />
                <div className="h-2 w-2 rounded-full bg-success/60" />
              </div>
              <div className="font-mono text-[9px] text-muted-foreground">RequestSearch</div>
              <div className="h-2 w-12 rounded bg-muted" />
            </div>
            {/* stats */}
            <div className="mb-3 grid grid-cols-4 gap-2 text-[9px]">
              {[
                ["12,847", "API Calls"],
                ["$245,680", "Revenue"],
                ["98.2%", "Uptime"],
                ["1.2s", "Avg Latency"],
              ].map(([v, l]) => (
                <div key={l} className="rounded border border-border p-1.5">
                  <div className="font-display font-bold text-primary">{v}</div>
                  <div className="text-[8px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            {/* chart */}
            <div className="mb-3 h-24 rounded border border-border p-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[9px] font-semibold text-foreground">Bookings Overview</div>
                <div className="h-1.5 w-10 rounded bg-accent/30" />
              </div>
              <svg viewBox="0 0 200 60" className="h-16 w-full">
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.18 45)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="oklch(0.7 0.18 45)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 50 L20 40 L40 45 L60 30 L80 35 L100 20 L120 25 L140 15 L160 22 L180 10 L200 18 L200 60 L0 60 Z" fill="url(#g1)" />
                <path d="M0 50 L20 40 L40 45 L60 30 L80 35 L100 20 L120 25 L140 15 L160 22 L180 10 L200 18" stroke="oklch(0.7 0.18 45)" strokeWidth="1.5" fill="none" />
                <path d="M0 55 L20 50 L40 48 L60 45 L80 40 L100 38 L120 32 L140 30 L160 28 L180 25 L200 22" stroke="oklch(0.24 0.06 260)" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            {/* bottom rows */}
            <div className="space-y-1.5">
              {[
                ["LOS → DXB", "$450"],
                ["JNB → CDG", "$720"],
                ["NBO → LHR", "$610"],
              ].map(([r, p]) => (
                <div key={r} className="flex items-center justify-between rounded bg-surface-2 px-2 py-1 text-[9px]">
                  <span className="font-mono text-foreground">{r}</span>
                  <span className="font-semibold text-accent">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="h-2 rounded-b-2xl bg-primary-deep" style={{ width: "110%", marginLeft: "-5%" }} />
      </div>

      {/* Phone */}
      <div className="absolute -left-2 bottom-12 w-32 rotate-[-6deg]">
        <div className="rounded-2xl bg-primary p-1.5 shadow-elevated">
          <div className="rounded-xl bg-white p-2">
            <div className="mb-1 h-1 w-6 rounded-full bg-muted" />
            <div className="mb-2 text-[7px] font-semibold text-foreground">Bookings</div>
            <svg viewBox="0 0 80 30" className="h-8 w-full">
              <path d="M0 25 L15 18 L30 22 L45 12 L60 16 L80 6" stroke="oklch(0.7 0.18 45)" strokeWidth="1.5" fill="none" />
            </svg>
            <div className="mt-2 space-y-1">
              {["LOS-DXB", "JNB-CDG", "NBO-LHR"].map((r) => (
                <div key={r} className="flex items-center justify-between text-[6px]">
                  <span className="font-mono">{r}</span>
                  <span className="font-bold text-accent">$450</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
