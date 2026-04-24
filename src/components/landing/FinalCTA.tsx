import { ArrowRight } from "lucide-react";
import ctaPeople from "@/assets/cta-people.jpg";

const bullets = ["Powerful APIs", "Global reach", "Infinite possibilities"];

export function FinalCTA() {
  return (
    <section id="cta" className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">16</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Final CTA</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Start building your<br />travel business today.
            </h2>
            <ul className="mt-6 space-y-3 text-base text-muted-foreground">
              {bullets.map((b) => <li key={b} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{b}</li>)}
            </ul>
            <a href="#" className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-accent transition hover:opacity-90" style={{ boxShadow: "var(--shadow-accent)" }}>
              Get API Access <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="relative">
            <svg viewBox="0 0 400 60" className="absolute -top-6 left-0 w-full" aria-hidden>
              <path d="M20 40 Q 200 -10 380 30" stroke="oklch(0.7 0.18 45)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
              <g transform="translate(40 28) rotate(-10)">
                <path d="M0 0 L20 6 L17 10 L7 8 L4 14 L0 12 L2 6 L-3 4 Z" fill="oklch(0.24 0.06 260)" />
              </g>
            </svg>
            <div className="overflow-hidden rounded-2xl border border-border shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
              <img src={ctaPeople} alt="Two professionals using Travsify dashboard" loading="lazy" width={1024} height={768} className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-white p-3 shadow-soft sm:block" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="text-[9px] font-semibold text-muted-foreground">Welcome back, John</div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-[9px]">
                <div><div className="font-display text-sm font-bold text-primary">12,540</div><div className="text-muted-foreground">Bookings</div></div>
                <div><div className="font-display text-sm font-bold text-primary">$245K</div><div className="text-muted-foreground">Revenue</div></div>
                <div><div className="font-display text-sm font-bold text-success">98.2%</div><div className="text-muted-foreground">Success</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
