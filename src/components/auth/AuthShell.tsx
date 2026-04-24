import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/landing/Logo";
import { Plane, Building2, Car, Globe2, Shield, MapPin } from "lucide-react";

const orbiting = [
  { icon: Plane, label: "Flights" },
  { icon: Building2, label: "Hotels" },
  { icon: MapPin, label: "Tours" },
  { icon: Globe2, label: "e-Visas" },
  { icon: Shield, label: "Insurance" },
  { icon: Car, label: "Transfers" },
];

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[5fr_6fr]">
      {/* Brand panel */}
      <aside
        className="relative hidden overflow-hidden lg:block"
        style={{ background: "linear-gradient(160deg, oklch(0.18 0.05 260) 0%, oklch(0.24 0.06 260) 55%, oklch(0.32 0.1 280) 100%)" }}
      >
        {/* Aurora */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl animate-float"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.18 45 / 0.7), transparent 60%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-32 h-[460px] w-[460px] rounded-full opacity-40 blur-3xl animate-float delay-300"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.2 250 / 0.6), transparent 60%)" }}
        />
        <div aria-hidden className="absolute inset-0 bg-grid opacity-[0.07]" />

        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="inline-block">
            <Logo invert />
          </Link>

          {/* Orbiting verticals */}
          <div className="relative mx-auto my-8 flex h-[340px] w-[340px] items-center justify-center">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full border border-white/10"
            />
            <div
              aria-hidden
              className="absolute inset-8 rounded-full border border-white/10"
            />
            <div
              aria-hidden
              className="absolute inset-16 rounded-full border border-white/10"
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-orange-500 shadow-2xl animate-pulse-glow">
              <span className="font-display text-2xl font-extrabold text-white">API</span>
            </div>
            <div className="absolute inset-0 animate-orbit">
              {orbiting.map((o, i) => {
                const angle = (i / orbiting.length) * Math.PI * 2;
                const r = 150;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                return (
                  <div
                    key={o.label}
                    className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg"
                    style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                  >
                    <o.icon className="h-5 w-5 text-white" />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
              {eyebrow}
            </div>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight">
              One API. <span className="text-gradient-accent">Every travel product.</span> Every market.
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/65">
              Flights, hotels, tours, transfers, e-Visas and insurance — wired into your platform with
              local payments built for Africa and the world.
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 font-display font-bold text-accent">
                AO
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/85">
                  "We replaced four vendors with one Travsify integration. Time-to-launch dropped from 6 months to 11 days."
                </p>
                <p className="mt-1 text-xs text-white/50">— Adaeze O., CTO at PathwayTrips</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{eyebrow}</div>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-primary md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
        <div className="px-6 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Travsify NDC. Trusted by travel teams in 40+ countries.
        </div>
      </main>
    </div>
  );
}
