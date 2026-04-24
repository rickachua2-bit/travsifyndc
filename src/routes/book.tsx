import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, Plane, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHero } from "@/components/landing/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { VerticalTabs, VERTICALS, type BookingVertical } from "@/components/booking/VerticalTabs";
import { Field, inputCls } from "@/components/booking/SearchForm";
import { FlightSearchForm, type FlightSearchPayload } from "@/components/booking/FlightSearchForm";
import { GuestCheckout, ConfirmationScreen, type CheckoutInput } from "@/components/booking/GuestCheckout";
import { CurrencySwitcher } from "@/components/booking/CurrencySwitcher";
import { publicSearchFlights } from "@/server/booking-engine";

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

type FlightOffer = {
  id: string; total_amount: string; total_currency: string; base_amount: number; base_currency: string; owner?: string;
  slices?: Array<{ origin?: string; destination?: string; segments?: Array<{ departing_at?: string; arriving_at?: string; marketing_carrier?: string; flight_number?: string }> }>;
};

function BookPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<BookingVertical>("flights");
  const vertical = VERTICALS.find((v) => v.id === tab)!;

  return (
    <PageShell>
      <PageHero
        eyebrow={isAuthenticated ? "Signed in · Pay from your wallet" : "Book travel · Pay securely with card"}
        title="One booking engine."
        highlight="Six travel products."
        description="Real inventory from the world's leading suppliers. Instant ticket and voucher delivery by email."
      >
        {isAuthenticated && (
          <button
            onClick={() => navigate({ to: "/dashboard-book" })}
            className="btn-glow inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
            style={{ boxShadow: "var(--shadow-accent)" }}
          >
            Open in dashboard <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <Link to="/docs" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent">
          API docs <ExternalLink className="h-4 w-4" />
        </Link>
      </PageHero>

      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-6xl space-y-6 px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <VerticalTabs value={tab} onChange={setTab} />
            </div>
            <CurrencySwitcher />
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-primary">{vertical.label}</h2>
            <p className="text-sm text-muted-foreground">{vertical.tagline}</p>
          </div>
          {tab === "flights" && <FlightsFlow />}
          {tab !== "flights" && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
              <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15"><vertical.icon className="h-5 w-5 text-accent" /></div>
              <h3 className="mt-3 font-display text-lg font-bold text-primary">{vertical.label} checkout — opening soon</h3>
              <p className="mt-1 text-sm text-muted-foreground">This vertical is wired to the same engine. Search and card checkout for {vertical.label.toLowerCase()} go live in the next release.</p>
              {isAuthenticated && (
                <p className="mt-3 text-xs text-muted-foreground">Signed-in partners can already book {vertical.label.toLowerCase()} from the dashboard.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function FlightsFlow() {
  const { currency: displayCurrency, format } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [picked, setPicked] = useState<FlightOffer | null>(null);
  const [checkout, setCheckout] = useState<CheckoutInput | null>(null);
  const [done, setDone] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  async function search(payload: FlightSearchPayload) {
    setBusy(true); setOffers([]); setPicked(null); setCheckout(null); setDone(null);
    try {
      const json = await publicSearchFlights({ data: {
        slices: payload.slices,
        return_date: payload.return_date,
        adults: payload.adults,
        children: payload.children,
        infants: payload.infants,
        cabin: payload.cabin,
        display_currency: displayCurrency,
      } });
      const parsed = JSON.parse(json) as { offers: FlightOffer[] };
      setOffers(parsed.offers || []);
      if (!parsed.offers?.length) toast.message("No flights for those dates");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function startCheckout(form: HTMLFormElement) {
    if (!picked) return;
    const fd = new FormData(form);
    const passenger = {
      given_name: String(fd.get("given_name")),
      family_name: String(fd.get("family_name")),
      born_on: String(fd.get("born_on")),
      gender: String(fd.get("gender")) as "m" | "f",
      title: String(fd.get("title")) as "mr" | "ms" | "mrs" | "miss" | "dr",
      email: String(fd.get("email")),
      phone_number: String(fd.get("phone")),
    };
    setCheckout({
      vertical: "flights",
      base_amount: picked.base_amount,
      currency: picked.base_currency,                 // provider native currency for compose_price input
      display_currency: displayCurrency,              // user's chosen settlement currency
      contact: { name: `${passenger.given_name} ${passenger.family_name}`, email: passenger.email, phone: passenger.phone_number },
      payload: { offer_id: picked.id, passengers: [passenger], provider_amount: picked.base_amount },
    });
  }

  if (done) {
    return <ConfirmationScreen {...done} vertical="flights" fulfillment="auto" onReset={() => { setDone(null); setOffers([]); setPicked(null); setCheckout(null); }} />;
  }
  if (checkout) {
    return <GuestCheckout input={checkout} onCancel={() => setCheckout(null)} onSuccess={(r) => { setDone(r); setCheckout(null); }} />;
  }

  return (
    <>
      <FlightSearchForm busy={busy} onSubmit={search} />

      {busy && <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching live inventory…</div>}

      {!picked && offers.length > 0 && (
        <div className="mt-6 space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Plane className="h-4 w-4" /></div>
                <div>
                  <div className="font-display text-sm font-bold text-primary">{o.owner || "Operating carrier"}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.slices?.[0]?.segments?.map((s) => `${s.marketing_carrier ?? ""}${s.flight_number ?? ""} ${new Date(s.departing_at || "").toLocaleString()} → ${new Date(s.arriving_at || "").toLocaleString()}`).join("  •  ")}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-extrabold text-primary">{format(Number(o.total_amount), o.total_currency)}</div>
                <button onClick={() => setPicked(o)} className="mt-1 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Select</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {picked && (
        <form onSubmit={(e) => { e.preventDefault(); startCheckout(e.currentTarget); }} className="mt-6 grid gap-3 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="col-span-full font-display text-base font-bold text-primary">Passenger details — {picked.total_currency} {Number(picked.total_amount).toLocaleString()}</h3>
          <Field label="Title"><select name="title" required className={inputCls}><option value="mr">Mr</option><option value="ms">Ms</option><option value="mrs">Mrs</option><option value="miss">Miss</option><option value="dr">Dr</option></select></Field>
          <Field label="Gender"><select name="gender" required className={inputCls}><option value="m">Male</option><option value="f">Female</option></select></Field>
          <Field label="Given name"><input name="given_name" required className={inputCls} /></Field>
          <Field label="Family name"><input name="family_name" required className={inputCls} /></Field>
          <Field label="Date of birth"><input name="born_on" type="date" required className={inputCls} /></Field>
          <Field label="Email (ticket destination)"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" required placeholder="+234 800 000 0000" className={inputCls} /></Field>
          <div className="col-span-full flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Back</button>
            <button type="submit" className="btn-glow rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Continue to payment</button>
          </div>
        </form>
      )}
    </>
  );
}
