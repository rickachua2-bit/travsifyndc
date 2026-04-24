import { Plane, Building2, Car, Globe2, Shield, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const verticals = [
  { icon: Plane, label: "Flights", desc: "500+ airlines, NDC ready" },
  { icon: Building2, label: "Hotels", desc: "1M+ properties worldwide" },
  { icon: Car, label: "Transfers", desc: "Door-to-door in 180 cities" },
  { icon: Globe2, label: "e-Visas", desc: "Apply in under 90 seconds" },
  { icon: Shield, label: "Insurance", desc: "Cover for every trip" },
];

export function Verticals() {
  return (
    <section id="verticals" className="border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="reveal mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">
            4
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Travel Verticals
          </span>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div className="reveal">
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Everything travelers want.<br />
              <span className="text-gradient-accent">One integration.</span>
            </h2>
            <p className="mt-4 max-w-sm text-base text-muted-foreground">
              Sell what your customers actually book — without negotiating with five vendors.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {verticals.map((v, i) => (
              <Link
                key={v.label}
                to="/developers"
                className="reveal group rounded-xl border border-border bg-white p-5 hover-lift"
                style={{ boxShadow: "var(--shadow-soft)", transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                  <v.icon className="h-5 w-5" />
                </div>
                <div className="mt-5 font-display text-base font-bold text-primary">{v.label}</div>
                <div className="mt-1 text-[11px] leading-tight text-muted-foreground">{v.desc}</div>
                <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
