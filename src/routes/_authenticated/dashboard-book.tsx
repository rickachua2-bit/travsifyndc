import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Wallet } from "lucide-react";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { VerticalTabs, VERTICALS, type BookingVertical } from "@/components/booking/VerticalTabs";
import { CurrencySwitcher } from "@/components/booking/CurrencySwitcher";
import {
  FlightsFlow, HotelsFlow, ToursFlow, VisasFlow,
  TransfersFlow, CarRentalsFlow, InsuranceFlow,
} from "@/components/booking/BookingFlows";

export const Route = createFileRoute("/_authenticated/dashboard-book")({
  component: DashboardBookPage,
  head: () => ({ meta: [{ title: "Book — pay from wallet · Travsify" }, { name: "robots", content: "noindex" }] }),
});

function DashboardBookPage() {
  const [tab, setTab] = useState<BookingVertical>("flights");
  const vertical = VERTICALS.find((v) => v.id === tab)!;

  return (
    <PartnerShell>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-[460px] w-[460px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.18 45 / 0.55), transparent 60%)" }}
        />
        <div aria-hidden className="absolute inset-0 bg-dots opacity-[0.07]" />

        <div className="relative mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
                <Wallet className="h-3 w-3" /> Pay instantly from wallet
              </div>
              <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl">
                Book travel, settle from your wallet
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/75">
                Same live inventory, instant settlement from your USD or NGN balance — no card needed.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CurrencySwitcher />
              <Link
                to="/wallet"
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-bold text-accent-foreground transition hover:opacity-95"
              >
                Top up wallet <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="-mb-px">
            <VerticalTabs value={tab} onChange={setTab} />
          </div>
        </div>
      </section>

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
                Live inventory · wallet pay
              </div>
            </div>

            {tab === "flights" && <FlightsFlow mode="wallet" />}
            {tab === "hotels" && <HotelsFlow mode="wallet" />}
            {tab === "tours" && <ToursFlow mode="wallet" />}
            {tab === "visas" && <VisasFlow mode="wallet" />}
            {tab === "transfers" && <TransfersFlow mode="wallet" />}
            {tab === "car_rentals" && <CarRentalsFlow mode="wallet" />}
            {tab === "insurance" && <InsuranceFlow mode="wallet" />}
          </div>
        </div>
      </section>
    </PartnerShell>
  );
}
