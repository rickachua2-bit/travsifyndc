import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { useReveal } from "@/hooks/useReveal";

export function PageShell({ children }: { children: React.ReactNode }) {
  useReveal();
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl animate-float"
        style={{ background: "radial-gradient(circle, oklch(0.7 0.18 45 / 0.4), transparent 60%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl animate-float delay-300"
        style={{ background: "radial-gradient(circle, oklch(0.24 0.06 260 / 0.4), transparent 60%)" }}
      />
      <div aria-hidden className="absolute inset-0 bg-dots opacity-40" />
      <div className="relative mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
        <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <span className="inline-block h-2 w-2 animate-pulse-glow rounded-full bg-accent" />
          {eyebrow}
        </div>
        <h1 className="animate-fade-in-up delay-100 mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-6xl lg:text-7xl">
          {title}
          {highlight && (
            <>
              <br />
              <span className="text-gradient-accent">{highlight}</span>
            </>
          )}
        </h1>
        <p className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {description}
        </p>
        {children && (
          <div className="animate-fade-in-up delay-300 mt-8 flex flex-wrap items-center justify-center gap-3">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
