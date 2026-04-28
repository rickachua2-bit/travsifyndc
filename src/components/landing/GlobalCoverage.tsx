const stats = ["500+ Airlines", "1M+ Hotels", "Thousands of routes"];

// Deterministic PRNG (mulberry32) so SSR and client output match
function seeded(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function GlobalCoverage() {
  // dotted world map approximation (deterministic to avoid hydration mismatch)
  const rand = seeded(1337);
  const dots: { x: number; y: number; hot?: boolean }[] = [];
  for (let i = 0; i < 600; i++) {
    const x = rand() * 600;
    const y = rand() * 280;
    // approximate continent shapes by skipping ocean cells
    const inLand =
      (x > 80 && x < 220 && y > 40 && y < 200) || // Americas
      (x > 250 && x < 340 && y > 40 && y < 220) || // Europe/Africa
      (x > 380 && x < 540 && y > 40 && y < 200);  // Asia/Oceania
    if (inLand) dots.push({ x, y });
  }
  const hotspots = [
    { x: 150, y: 120 }, { x: 290, y: 100 }, { x: 310, y: 180 }, { x: 460, y: 140 }, { x: 520, y: 180 },
  ];

  return (
    <section className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">12</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Global Coverage</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Access travel inventory across 100+ countries
            </h2>
            <ul className="mt-6 space-y-3 text-base text-muted-foreground">
              {stats.map((b) => <li key={b} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{b}</li>)}
            </ul>
          </div>

          <div className="relative">
            <svg viewBox="0 0 600 280" className="h-auto w-full">
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="1.4" fill="oklch(0.24 0.06 260)" opacity="0.5" />
              ))}
              {hotspots.map((h, i) => (
                <g key={i}>
                  <circle cx={h.x} cy={h.y} r="14" fill="oklch(0.7 0.18 45)" opacity="0.15" />
                  <circle cx={h.x} cy={h.y} r="7" fill="oklch(0.7 0.18 45)" opacity="0.35" />
                  <circle cx={h.x} cy={h.y} r="3" fill="oklch(0.7 0.18 45)" />
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
