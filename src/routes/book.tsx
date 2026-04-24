import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHero } from "@/components/landing/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { VerticalTabs, VERTICALS, type BookingVertical } from "@/components/booking/VerticalTabs";
import { Field, inputCls } from "@/components/booking/SearchForm";
import { FlightSearchForm, type FlightSearchPayload } from "@/components/booking/FlightSearchForm";
import { FlightResults, type FlightOffer } from "@/components/booking/FlightResults";
import { HotelSearchForm, type HotelSearchPayload } from "@/components/booking/HotelSearchForm";
import { HotelResults, type Hotel } from "@/components/booking/HotelResults";
import { findCityByCode } from "@/data/cities";
import { GuestCheckout, ConfirmationScreen, type CheckoutInput } from "@/components/booking/GuestCheckout";
import { CurrencySwitcher } from "@/components/booking/CurrencySwitcher";
import { publicSearchFlights, publicSearchHotels } from "@/server/booking-engine";

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
          {tab === "hotels" && <HotelsFlow />}
          {tab !== "flights" && tab !== "hotels" && (
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
  const [routeLabel, setRouteLabel] = useState("");
  const [picked, setPicked] = useState<FlightOffer | null>(null);
  const [checkout, setCheckout] = useState<CheckoutInput | null>(null);
  const [done, setDone] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  async function search(payload: FlightSearchPayload) {
    setRouteLabel(`${payload.slices[0]?.destination || ""}`);
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
        <FlightResults offers={offers} routeLabel={routeLabel} format={format} onSelect={(o) => setPicked(o)} />
      )}

      {picked && (
        <form onSubmit={(e) => { e.preventDefault(); startCheckout(e.currentTarget); }} className="mt-6 grid gap-3 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="col-span-full font-display text-base font-bold text-primary">Passenger details — {format(Number(picked.total_amount), picked.total_currency)}</h3>
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

function HotelsFlow() {
  const { currency: displayCurrency, format } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [destLabel, setDestLabel] = useState("");
  const [searchMeta, setSearchMeta] = useState<{ nights: number; rooms: number; adults: number; children: number; checkin: string; checkout: string } | null>(null);
  const [picked, setPicked] = useState<Hotel | null>(null);
  const [checkout, setCheckoutInput] = useState<CheckoutInput | null>(null);
  const [done, setDone] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  async function search(payload: HotelSearchPayload) {
    const city = findCityByCode(payload.city_code);
    setDestLabel(city ? `${city.city}, ${city.country_name}` : payload.city_code);
    const nights = Math.max(1, Math.round((+new Date(payload.checkout) - +new Date(payload.checkin)) / 86400000));
    setSearchMeta({ nights, rooms: payload.rooms, adults: payload.adults, children: payload.children, checkin: payload.checkin, checkout: payload.checkout });
    setBusy(true); setHotels([]); setPicked(null); setCheckoutInput(null); setDone(null);
    try {
      const json = await publicSearchHotels({ data: {
        city_code: payload.city_code,
        city_name: payload.city_name,
        country_code: payload.country_code,
        checkin: payload.checkin,
        checkout: payload.checkout,
        adults: payload.adults * payload.rooms,
        children: payload.children,
        currency: "USD",
        display_currency: displayCurrency,
      } });
      const parsed = JSON.parse(json) as { hotels: Hotel[]; error?: string };
      setHotels(parsed.hotels || []);
      if (parsed.error) toast.error(parsed.error);
      else if (!parsed.hotels?.length) toast.message("No hotels available for those dates");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function startCheckout(form: HTMLFormElement) {
    if (!picked || !searchMeta) return;
    const fd = new FormData(form);
    const holder = {
      firstName: String(fd.get("first_name")),
      lastName: String(fd.get("last_name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone")),
    };
    const totalNights = Number(picked.price) * searchMeta.nights;
    setCheckoutInput({
      vertical: "hotels",
      base_amount: Number(picked.base_price ?? picked.price) * searchMeta.nights,
      currency: picked.base_currency || picked.currency || "USD",
      display_currency: displayCurrency,
      contact: { name: `${holder.firstName} ${holder.lastName}`, email: holder.email, phone: holder.phone },
      payload: {
        offer_id: picked.offer_id,
        hotel_id: picked.id,
        hotel_name: picked.name,
        checkin: searchMeta.checkin,
        checkout: searchMeta.checkout,
        nights: searchMeta.nights,
        rooms: searchMeta.rooms,
        guests: { adults: searchMeta.adults, children: searchMeta.children },
        holder,
        provider_amount_per_night: picked.base_price ?? picked.price,
        provider_total_amount: totalNights,
      },
    });
  }

  if (done) {
    return <ConfirmationScreen {...done} vertical="hotels" fulfillment="auto" onReset={() => { setDone(null); setHotels([]); setPicked(null); setCheckoutInput(null); }} />;
  }
  if (checkout) {
    return <GuestCheckout input={checkout} onCancel={() => setCheckoutInput(null)} onSuccess={(r) => { setDone(r); setCheckoutInput(null); }} />;
  }

  return (
    <>
      <HotelSearchForm busy={busy} onSubmit={search} />

      {busy && <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching live inventory…</div>}

      {!picked && hotels.length > 0 && searchMeta && (
        <HotelResults
          hotels={hotels}
          destinationLabel={destLabel}
          nights={searchMeta.nights}
          rooms={searchMeta.rooms}
          format={format}
          onSelect={(h) => setPicked(h)}
        />
      )}

      {picked && searchMeta && (
        <form
          onSubmit={(e) => { e.preventDefault(); startCheckout(e.currentTarget); }}
          className="mt-6 grid gap-3 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="col-span-full flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-primary">Lead guest details</h3>
              <p className="text-xs text-muted-foreground">{picked.name} · {searchMeta.nights} night{searchMeta.nights > 1 ? "s" : ""} · {searchMeta.rooms} room{searchMeta.rooms > 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-lg font-extrabold text-primary">{format(Number(picked.price) * searchMeta.nights, picked.currency)}</div>
            </div>
          </div>
          <Field label="First name"><input name="first_name" required className={inputCls} /></Field>
          <Field label="Last name"><input name="last_name" required className={inputCls} /></Field>
          <Field label="Email (voucher destination)"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" required placeholder="+234 800 000 0000" className={inputCls} /></Field>
          <div className="col-span-full flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Back to results</button>
            <button type="submit" className="btn-glow rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Continue to payment</button>
          </div>
        </form>
      )}
    </>
  );
}
