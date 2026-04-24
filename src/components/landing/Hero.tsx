import { ArrowRight } from "lucide-react";
import { DashboardMock } from "./DashboardMock";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border" style={{ background: "var(--gradient-hero)" }}>
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-6xl lg:text-7xl">
            Build. Launch.<br />
            Scale Your Travel<br />
            Business — <span className="text-accent">Instantly.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            One API. Global Inventory.<br />
            Built for Africa & the World.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#cta" className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-accent transition hover:opacity-90" style={{ boxShadow: "var(--shadow-accent)" }}>
              Get API Access <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#docs" className="inline-flex items-center rounded-md border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
              View Docs
            </a>
          </div>
        </div>
        <div className="relative">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}
