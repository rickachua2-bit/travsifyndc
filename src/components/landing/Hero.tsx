import { ArrowRight, Plane, Hotel, Car, MapPin, FileCheck2, ShieldPlus, Wallet, Code2, Sparkles, Globe2, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/travsify-logo-mark.png";

const verticals = [
  { icon: Plane,       label: "Flights",    sub: "Duffel · NDC",   tone: "from-sky-500 to-blue-600",       delay: "0s" },
  { icon: Hotel,       label: "Hotels",     sub: "2M+ properties", tone: "from-violet-500 to-fuchsia-600", delay: "0.15s" },
  { icon: Car,         label: "Transfers",  sub: "180 countries",  tone: "from-emerald-500 to-teal-600",   delay: "0.3s" },
  { icon: MapPin,      label: "Tours",      sub: "Activities",     tone: "from-amber-500 to-orange-600",   delay: "0.45s" },
  { icon: FileCheck2,  label: "e-Visas",    sub: "Sherpa-powered", tone: "from-rose-500 to-pink-600",      delay: "0.6s" },
  { icon: ShieldPlus,  label: "Insurance",  sub: "Per-trip cover", tone: "from-indigo-500 to-purple-600",  delay: "0.75s" },
];

const ticker = [
  "LOS → DXB · $612",
  "Marriott Lagos · $189/nt",
  "JFK airport transfer · $84",
  "Dubai e-Visa · 24h · $98",
  "Trip insurance · $14/wk",
  "Eiffel Tower skip-line · $42",
  "JNB → CDG · $1,240",
  "Safari day-trip · $215",
];

export function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b border-border bg-background"
    >
      {/* decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl animate-float"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 60%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[460px] w-[460px] rounded-full opacity-20 blur-3xl animate-float delay-300"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 60%)" }}
      />
      <div aria-hidden className="absolute inset-0 bg-dots opacity-20" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pt-6 pb-14 lg:grid-cols-[1.05fr_1fr] lg:pt-8 lg:pb-20">
        {/* LEFT — copy */}
        <div>
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="inline-block h-2 w-2 animate-pulse-glow rounded-full bg-primary" />
            One unified API · 200+ countries · 6 verticals
          </div>

          <h1 className="animate-fade-in-up delay-100 mt-4 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-[64px]">
            Flights. Hotels.<br />
            Transfers. Tours.<br />
            e-Visas. Insurance.<br />
            <span className="text-gradient-accent">One API.</span>
          </h1>

          <p className="animate-fade-in-up delay-200 mt-6 max-w-md text-lg text-muted-foreground">
            Sell every travel product from your platform — with one integration, one
            schema, instant local payments, and built-in markup controls.
          </p>

          <div className="animate-fade-in-up delay-300 mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="btn-glow group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-accent transition hover:opacity-95"
            >
              Apply for API access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white/5 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
            >
              Try the live demo
            </Link>
          </div>
          <p className="animate-fade-in-up delay-400 mt-3 text-xs text-muted-foreground">
            Sandbox keys instantly · Live access in 24–72h after KYC
          </p>

          {/* feature chips */}
          <div className="animate-fade-in-up delay-500 mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { icon: Code2,   label: "2-line SDK install" },
              { icon: Wallet,  label: "Local + USD payments" },
              { icon: Zap,     label: "Sandbox in 60 sec" },
              { icon: Globe2,  label: "200+ countries" },
              { icon: Sparkles,label: "Built-in markup engine" },
              { icon: ShieldPlus, label: "PCI-DSS · SOC 2" },
            ].map((c) => (
              <div
                key={c.label}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-white/5 px-3 py-2 text-xs font-medium text-foreground backdrop-blur"
              >
                <c.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — animated "everything at a glance" visual */}
        <div className="relative animate-scale-in delay-200">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-3xl opacity-20 blur-3xl"
            style={{ background: "var(--primary)" }}
          />

          {/* Orbiting verticals around a central API hub */}
          <div className="relative mx-auto aspect-square w-full max-w-[480px]">
            {/* dotted concentric rings */}
            <div aria-hidden className="absolute inset-[8%] rounded-full border border-dashed border-primary/15" />
            <div aria-hidden className="absolute inset-[22%] rounded-full border border-dashed border-primary/10" />

            {/* connecting lines from center to each vertical (svg) */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
              {verticals.map((_, i) => {
                const angle = (i / verticals.length) * Math.PI * 2 - Math.PI / 2;
                const x = 50 + Math.cos(angle) * 40;
                const y = 50 + Math.sin(angle) * 40;
                return (
                  <line
                    key={i}
                    x1="50" y1="50" x2={x} y2={y}
                    stroke="var(--primary)"
                    strokeWidth="0.25"
                    strokeDasharray="0.8 0.8"
                    opacity="0.3"
                  />
                );
              })}
            </svg>

            {/* central API hub */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="relative flex h-32 w-32 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-2xl opacity-20"
                  style={{ background: "var(--primary)" }}
                />
                <div className="relative text-center">
                  <img
                    src={logoMark}
                    alt="Travsify"
                    width={40}
                    height={40}
                    className="mx-auto h-10 w-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] invert brightness-0"
                  />
                  <div className="mt-1 font-display text-[11px] font-bold uppercase tracking-wider text-white">
                    Travsify
                  </div>
                  <div className="font-mono text-[9px] text-white/85">api.v1</div>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[8px] font-semibold text-primary">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                    LIVE
                  </div>
                </div>
              </div>
            </div>

            {/* orbiting vertical chips */}
            {verticals.map((v, i) => {
              const angle = (i / verticals.length) * 360 - 90;
              return (
                <div
                  key={v.label}
                  className="absolute left-1/2 top-1/2 h-0 w-0"
                  style={{ transform: `rotate(${angle}deg) translate(180px) rotate(${-angle}deg)` }}
                >
                  <div
                    className="relative -translate-x-1/2 -translate-y-1/2"
                    style={{ animation: `float 5s ease-in-out ${v.delay} infinite` }}
                  >
                    <div className="hover-lift flex w-[120px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-xl backdrop-blur-md">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${v.tone} text-white`}>
                        <v.icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display text-xs font-bold leading-tight text-foreground">{v.label}</div>
                        <div className="truncate text-[9px] text-muted-foreground">{v.sub}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* live activity ticker */}
            <div className="pointer-events-none absolute -bottom-2 left-1/2 w-[110%] -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-black/40 py-2 backdrop-blur-md">
              <div className="flex w-max gap-8 whitespace-nowrap font-mono text-[10px] text-white/90 animate-ticker">
                {[...ticker, ...ticker].map((t, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* floating payment badge */}
          <div className="absolute -left-2 top-2 hidden animate-float rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-xl backdrop-blur-md md:block">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-[11px] font-bold text-foreground">Local payments</div>
                <div className="text-[9px] text-muted-foreground">NGN · KES · ZAR · USD · EUR</div>
              </div>
            </div>
          </div>

          {/* floating markup badge */}
          <div className="absolute -right-2 top-12 hidden animate-float delay-300 rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-xl backdrop-blur-md md:block">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-[11px] font-bold text-foreground">+12% markup</div>
                <div className="text-[9px] text-muted-foreground">Set your own margin</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
