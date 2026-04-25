import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ExternalLink, ShieldCheck, Headphones, BadgeCheck, CreditCard } from "lucide-react";
import { PageShell } from "@/components/landing/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { VerticalTabs, VERTICALS, type BookingVertical } from "@/components/booking/VerticalTabs";
import { CurrencySwitcher } from "@/components/booking/CurrencySwitcher";
import {
  FlightsFlow, HotelsFlow, ToursFlow, VisasFlow,
  TransfersFlow, CarRentalsFlow, InsuranceFlow,
} from "@/components/booking/BookingFlows";

export const Route = createFileRoute("/book")({
  component: BookPage,
  head: () => ({
    meta: [
      { title: "Book travel — flights, hotels, tours & more · Travsify" },
      { name: "description", content: "Search and book flights, hotels, tours, transfers, e-Visas and travel insurance. Pay securely with card. Confirmation by email." },
      { property: "og:title", content: "Book travel · Travsify" },
      { property: "og:description", content: "One platform for flights, hotels, tours, transfers, visas and insurance — real inventory, instant confirmation." },
    ],
  }),
});

function BookPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<BookingVertical>("flights");
  const vertical = VERTICALS.find((v) => v.id === tab)!;

  return (
    <PageShell>
      {/* OTA-style hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.18 45 / 0.55), transparent 60%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.14 240 / 0.55), transparent 60%)" }}
        />
        <div aria-hidden className="absolute inset-0 bg-dots opacity-[0.07]" />

        <div className="relative mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
                <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-accent" />
                {isAuthenticated ? "Signed in · pay from wallet" : "Search · compare · book in seconds"}
              </div>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Where to next?
                <span className="block text-gradient-accent">Flights, stays & more — one search.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-white/75 sm:text-base">
                Real inventory from the world&rsquo;s leading suppliers. Instant tickets & vouchers emailed on payment.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CurrencySwitcher />
              {isAuthenticated && (
                <button
                  onClick={() => navigate({ to: "/dashboard-book" })}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-bold text-accent-foreground transition hover:opacity-95"
                >
                  Pay from wallet <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              <Link
                to="/docs"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur transition hover:border-accent hover:text-white"
              >
                API docs <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="-mb-px">
            <VerticalTabs value={tab} onChange={setTab} />
          </div>
        </div>
      </section>

      {/* Floating search card */}
      <section className="relative bg-surface pb-12 pt-6 sm:pt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className="relative -mt-2 rounded-b-2xl rounded-tr-2xl border border-border bg-white p-4 sm:p-6"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-primary sm:text-xl">{vertical.label}</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">{vertical.tagline}</p>
              </div>
              <div className="hidden items-center gap-1.5 text-[11px] font-semibold text-success sm:inline-flex">
                <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-success" />
                Live inventory
              </div>
            </div>

            {tab === "flights" && <FlightsFlow mode="guest" />}
            {tab === "hotels" && <HotelsFlow mode="guest" />}
            {tab === "tours" && <ToursFlow mode="guest" />}
            {tab === "visas" && <VisasFlow mode="guest" />}
            {tab === "transfers" && <TransfersFlow mode="guest" />}
            {tab === "car_rentals" && <CarRentalsFlow mode="guest" />}
            {tab === "insurance" && <InsuranceFlow mode="guest" />}
          </div>

          {/* Trust strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: "Secure checkout", sub: "PCI-DSS · 3-D Secure" },
              { icon: BadgeCheck, label: "Real inventory", sub: "NDC · 1.6M+ stays" },
              { icon: CreditCard, label: "Pay your way", sub: "Card, USD or NGN" },
              { icon: Headphones, label: "24/7 support", sub: "Email & chat" },
            ].map((t) => (
              <div key={t.label} className="flex items-start gap-2 rounded-xl border border-border bg-white p-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <t.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-primary">{t.label}</div>
                  <div className="text-[11px] leading-tight text-muted-foreground">{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
