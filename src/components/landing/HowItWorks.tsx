import { ArrowRight, KeyRound, Code2, Rocket } from "lucide-react";
import { Link } from "@tanstack/react-router";

const steps = [
  { n: 1, title: "Get your API key", desc: "Sign up free. Sandbox in 60 seconds — no card required.", color: "bg-accent", Icon: KeyRound },
  { n: 2, title: "Integrate", desc: "Drop in our SDK. Books a flight in under 50 lines of code.", color: "bg-primary", Icon: Code2 },
  { n: 3, title: "Go live & earn", desc: "Switch to live mode and start collecting margin from day one.", color: "bg-success", Icon: Rocket },
];

export function HowItWorks() {
  return (
    <section className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="reveal mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">10</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">How it works</span>
        </div>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="reveal">
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Three steps. <br />
              <span className="text-gradient-accent">Infinite possibilities.</span>
            </h2>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              From signup to first booking in a single afternoon. We handle the carriers, banks and compliance — you ship.
            </p>
            <Link
              to="/developers"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent story-link"
            >
              Read the integration guide <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center justify-between gap-4">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="reveal flex flex-1 items-center"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="text-center">
                  <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${s.color} font-display text-base font-bold text-white shadow-soft transition hover:-translate-y-1 hover:scale-105`}
                  >
                    <s.Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3 font-display text-base font-bold text-primary">{s.title}</div>
                  <div className="mt-1 max-w-[140px] text-xs text-muted-foreground">{s.desc}</div>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="mx-2 flex-1 text-accent/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
