import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DashboardMock } from "./DashboardMock";

const trustChips = [
  { icon: Zap, label: "Live in 7 days" },
  { icon: ShieldCheck, label: "PCI-DSS & GDPR" },
  { icon: Sparkles, label: "500+ airlines" },
];

export function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl animate-float"
        style={{ background: "radial-gradient(circle, oklch(0.7 0.18 45 / 0.45), transparent 60%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[460px] w-[460px] rounded-full opacity-40 blur-3xl animate-float delay-300"
        style={{ background: "radial-gradient(circle, oklch(0.24 0.06 260 / 0.35), transparent 60%)" }}
      />
      <div aria-hidden className="absolute inset-0 bg-dots opacity-40" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div>
          <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <span className="inline-block h-2 w-2 animate-pulse-glow rounded-full bg-accent" />
            Now live across 54 African markets
          </div>

          <h1 className="animate-fade-in-up delay-100 mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-6xl lg:text-7xl">
            Build. Launch.<br />
            Scale your travel<br />
            business — <span className="text-gradient-accent">instantly.</span>
          </h1>

          <p className="animate-fade-in-up delay-200 mt-6 max-w-md text-lg text-muted-foreground">
            One API for flights, hotels, transfers, e-Visas and insurance.
            Global inventory, local payments — built for Africa, ready for the world.
          </p>

          <div className="animate-fade-in-up delay-300 mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/contact"
              className="btn-glow group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-accent transition hover:opacity-95"
              style={{ boxShadow: "var(--shadow-accent)" }}
            >
              Get API Access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
            >
              Watch live demo
            </Link>
          </div>

          <div className="animate-fade-in-up delay-500 mt-8 flex flex-wrap gap-2">
            {trustChips.map((c) => (
              <div
                key={c.label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur"
              >
                <c.icon className="h-3.5 w-3.5 text-accent" />
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-scale-in delay-200">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-3xl opacity-60 blur-2xl"
            style={{ background: "var(--gradient-accent)" }}
          />
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}
