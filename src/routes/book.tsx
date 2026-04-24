import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHero } from "@/components/landing/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { VerticalTabs, VERTICALS, type BookingVertical } from "@/components/booking/VerticalTabs";
import { Field as SFField, inputCls } from "@/components/booking/SearchForm";
const Field = SFField;
import { FlightSearchForm, type FlightSearchPayload } from "@/components/booking/FlightSearchForm";
import { FlightResults, type FlightOffer } from "@/components/booking/FlightResults";
import { HotelSearchForm, type HotelSearchPayload } from "@/components/booking/HotelSearchForm";
import { HotelResults, type Hotel } from "@/components/booking/HotelResults";
import { TourSearchForm, type TourSearchPayload } from "@/components/booking/TourSearchForm";
import { TourResults, type Tour } from "@/components/booking/TourResults";
import { VisaSearchForm, type VisaSearchPayload } from "@/components/booking/VisaSearchForm";
import { VisaResults, type VisaProduct } from "@/components/booking/VisaResults";
import { TransferSearchForm, type TransferSearchPayload } from "@/components/booking/TransferSearchForm";
import { TransferResults, type TransferQuote } from "@/components/booking/TransferResults";
import { InsuranceSearchForm, type InsuranceSearchPayload } from "@/components/booking/InsuranceSearchForm";
import { InsuranceResults, type InsuranceQuote } from "@/components/booking/InsuranceResults";
import { findCityByCode } from "@/data/cities";
import { GuestCheckout, ConfirmationScreen, type CheckoutInput } from "@/components/booking/GuestCheckout";
import { CurrencySwitcher } from "@/components/booking/CurrencySwitcher";
import { publicSearchFlights, publicSearchHotels, publicSearchTours, publicSearchTransfers, publicSearchInsurance } from "@/server/booking-engine";
import { publicSearchVisaProducts } from "@/server/visa-products.functions";

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
          {tab === "tours" && <ToursFlow />}
          {tab === "visas" && <VisasFlow />}
          {tab === "transfers" && <TransfersFlow />}
          {tab === "insurance" && <InsuranceFlow />}
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

function ToursFlow() {
  const { currency: displayCurrency, format } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [destLabel, setDestLabel] = useState("");
  const [searchMeta, setSearchMeta] = useState<{ adults: number; children: number; date_from: string; date_to: string } | null>(null);
  const [picked, setPicked] = useState<Tour | null>(null);
  const [checkout, setCheckoutInput] = useState<CheckoutInput | null>(null);
  const [done, setDone] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  async function search(payload: TourSearchPayload) {
    setDestLabel(payload.destination_label);
    setSearchMeta({ adults: payload.adults, children: payload.children, date_from: payload.date_from, date_to: payload.date_to });
    setBusy(true); setTours([]); setPicked(null); setCheckoutInput(null); setDone(null);
    try {
      const json = await publicSearchTours({ data: {
        query: payload.query,
        date_from: payload.date_from,
        date_to: payload.date_to,
        currency: "USD",
        display_currency: displayCurrency,
      } });
      const parsed = JSON.parse(json) as { tours: Tour[]; error?: string };
      setTours(parsed.tours || []);
      if (parsed.error) toast.error(parsed.error);
      else if (!parsed.tours?.length) toast.message("No experiences for those dates");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function startCheckout(form: HTMLFormElement) {
    if (!picked || !searchMeta) return;
    const fd = new FormData(form);
    const lead = {
      firstName: String(fd.get("first_name")),
      lastName: String(fd.get("last_name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone")),
    };
    const tourDate = String(fd.get("tour_date") || searchMeta.date_from);
    const totalTravelers = searchMeta.adults + searchMeta.children;
    const baseTotal = Number(picked.base_price ?? picked.price) * totalTravelers;
    setCheckoutInput({
      vertical: "tours",
      base_amount: baseTotal,
      currency: picked.base_currency || picked.currency || "USD",
      display_currency: displayCurrency,
      contact: { name: `${lead.firstName} ${lead.lastName}`, email: lead.email, phone: lead.phone },
      payload: {
        tour_id: picked.id,
        tour_title: picked.title,
        tour_date: tourDate,
        travelers: { adults: searchMeta.adults, children: searchMeta.children },
        lead,
        provider_amount_per_person: picked.base_price ?? picked.price,
        provider_total_amount: baseTotal,
      },
    });
  }

  if (done) {
    return <ConfirmationScreen {...done} vertical="tours" fulfillment="manual" onReset={() => { setDone(null); setTours([]); setPicked(null); setCheckoutInput(null); }} />;
  }
  if (checkout) {
    return <GuestCheckout input={checkout} onCancel={() => setCheckoutInput(null)} onSuccess={(r) => { setDone(r); setCheckoutInput(null); }} />;
  }

  const totalTravelers = searchMeta ? searchMeta.adults + searchMeta.children : 0;

  return (
    <>
      <TourSearchForm busy={busy} onSubmit={search} />

      {busy && <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching live experiences…</div>}

      {!picked && tours.length > 0 && searchMeta && (
        <TourResults
          tours={tours}
          destinationLabel={destLabel}
          travelers={totalTravelers}
          format={format}
          onSelect={(t) => setPicked(t)}
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
              <h3 className="font-display text-base font-bold text-primary">Lead traveler details</h3>
              <p className="text-xs text-muted-foreground">{picked.title} · {totalTravelers} traveler{totalTravelers > 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-lg font-extrabold text-primary">{format(Number(picked.price) * totalTravelers, picked.currency)}</div>
            </div>
          </div>
          <Field label="Tour date">
            <input name="tour_date" type="date" required min={searchMeta.date_from} max={searchMeta.date_to} defaultValue={searchMeta.date_from} className={inputCls} />
          </Field>
          <Field label="Email (voucher destination)"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="First name"><input name="first_name" required className={inputCls} /></Field>
          <Field label="Last name"><input name="last_name" required className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" required placeholder="+234 800 000 0000" className={inputCls} /></Field>
          <div className="col-span-full rounded-md bg-surface p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Heads up:</strong> Tours are confirmed within a few hours after payment. Your voucher will be emailed to you once the operator confirms availability.
          </div>
          <div className="col-span-full flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Back to results</button>
            <button type="submit" className="btn-glow rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Continue to payment</button>
          </div>
        </form>
      )}
    </>
  );
}

function VisasFlow() {
  const { currency: displayCurrency, format } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<VisaProduct[]>([]);
  const [searchMeta, setSearchMeta] = useState<VisaSearchPayload | null>(null);
  const [picked, setPicked] = useState<VisaProduct | null>(null);
  const [checkout, setCheckoutInput] = useState<CheckoutInput | null>(null);
  const [done, setDone] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  async function search(payload: VisaSearchPayload) {
    setSearchMeta(payload);
    setBusy(true); setProducts([]); setPicked(null); setCheckoutInput(null); setDone(null);
    try {
      const json = await publicSearchVisaProducts({ data: {
        nationality: payload.nationality,
        destination: payload.destination || undefined,
        display_currency: displayCurrency,
      } });
      const parsed = JSON.parse(json) as { products: VisaProduct[]; error?: string };
      setProducts(parsed.products || []);
      if (parsed.error) toast.error(parsed.error);
      else if (!parsed.products?.length) toast.message("No visa corridors available for this combination yet");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function startCheckout(form: HTMLFormElement) {
    if (!picked) return;
    const fd = new FormData(form);
    const applicant = {
      firstName: String(fd.get("first_name")),
      lastName: String(fd.get("last_name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone")),
      dateOfBirth: String(fd.get("dob")),
      passportNumber: String(fd.get("passport_no")),
      passportExpiry: String(fd.get("passport_expiry")),
      nationality: picked.nationality,
    };
    const travelDates = {
      arrival: String(fd.get("arrival") || ""),
      departure: String(fd.get("departure") || ""),
    };
    setCheckoutInput({
      vertical: "visas",
      base_amount: picked.base_price,
      currency: picked.base_currency,
      display_currency: displayCurrency,
      contact: { name: `${applicant.firstName} ${applicant.lastName}`, email: applicant.email, phone: applicant.phone },
      payload: {
        visa_product_id: picked.id,
        visa_type: picked.visa_type,
        destination: picked.destination,
        destination_name: picked.destination_name,
        nationality: picked.nationality,
        nationality_name: picked.nationality_name,
        applicant,
        travel_dates: travelDates,
        sherpa_url: picked.sherpa_url,
        provider_amount: picked.base_price,
      },
    });
  }

  if (done) {
    return <ConfirmationScreen {...done} vertical="visas" fulfillment="manual" onReset={() => { setDone(null); setProducts([]); setPicked(null); setCheckoutInput(null); }} />;
  }
  if (checkout) {
    return <GuestCheckout input={checkout} onCancel={() => setCheckoutInput(null)} onSuccess={(r) => { setDone(r); setCheckoutInput(null); }} />;
  }

  const todayPlus = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

  return (
    <>
      <VisaSearchForm busy={busy} onSubmit={search} />

      {busy && <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading visa options…</div>}

      {!picked && products.length > 0 && searchMeta && (
        <VisaResults
          products={products}
          nationalityLabel={searchMeta.nationality_name}
          destinationLabel={searchMeta.destination_name}
          format={format}
          onSelect={(p) => setPicked(p)}
        />
      )}

      {picked && (
        <form
          onSubmit={(e) => { e.preventDefault(); startCheckout(e.currentTarget); }}
          className="mt-6 grid gap-3 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="col-span-full flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-display text-base font-bold text-primary">Applicant details</h3>
              <p className="text-xs text-muted-foreground">{picked.destination_name} {picked.visa_type} · processing {picked.processing_days_min}–{picked.processing_days_max} days</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-lg font-extrabold text-primary">{format(picked.price, picked.currency)}</div>
            </div>
          </div>
          <Field label="First name (as on passport)"><input name="first_name" required className={inputCls} /></Field>
          <Field label="Last name (as on passport)"><input name="last_name" required className={inputCls} /></Field>
          <Field label="Date of birth"><input name="dob" type="date" required max={todayPlus(-365 * 16)} className={inputCls} /></Field>
          <Field label="Passport number"><input name="passport_no" required minLength={4} maxLength={20} className={inputCls} /></Field>
          <Field label="Passport expiry date"><input name="passport_expiry" type="date" required min={todayPlus(180)} className={inputCls} /></Field>
          <Field label="Email (eVisa destination)"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" required placeholder="+234 800 000 0000" className={inputCls} /></Field>
          <Field label="Intended arrival date"><input name="arrival" type="date" required min={todayPlus(picked.processing_days_max)} className={inputCls} /></Field>
          <Field label="Intended departure date"><input name="departure" type="date" required className={inputCls} /></Field>
          <div className="col-span-full rounded-md bg-surface p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Heads up:</strong> Visa applications are reviewed and submitted to the issuing authority by our ops team within 24 hours. Your eVisa PDF will be emailed to you in {picked.processing_days_min}–{picked.processing_days_max} business days. We'll request additional documents (photo, supporting letters) by email if needed.
          </div>
          <div className="col-span-full flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Back to results</button>
            <button type="submit" className="btn-glow rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Continue to payment</button>
          </div>
        </form>
      )}
    </>
  );
}

function TransfersFlow() {
  const { currency: displayCurrency, format } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [quotes, setQuotes] = useState<TransferQuote[]>([]);
  const [searchMeta, setSearchMeta] = useState<TransferSearchPayload | null>(null);
  const [picked, setPicked] = useState<TransferQuote | null>(null);
  const [checkout, setCheckoutInput] = useState<CheckoutInput | null>(null);
  const [done, setDone] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  async function search(payload: TransferSearchPayload) {
    setSearchMeta(payload);
    setBusy(true); setQuotes([]); setPicked(null); setCheckoutInput(null); setDone(null);
    try {
      const json = await publicSearchTransfers({ data: {
        pickup_address: payload.pickup_address,
        dropoff_address: payload.dropoff_address,
        pickup_datetime: payload.pickup_datetime,
        num_passengers: payload.num_passengers,
        currency: "USD",
        display_currency: displayCurrency,
      } });
      const parsed = JSON.parse(json) as { quotes: TransferQuote[]; error?: string };
      setQuotes(parsed.quotes || []);
      if (parsed.error) toast.error(parsed.error);
      else if (!parsed.quotes?.length) toast.message("No transfers available for that route");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function startCheckout(form: HTMLFormElement) {
    if (!picked || !searchMeta) return;
    const fd = new FormData(form);
    const passenger = {
      firstName: String(fd.get("first_name")),
      lastName: String(fd.get("last_name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone")),
    };
    setCheckoutInput({
      vertical: "transfers",
      base_amount: Number(picked.base_price ?? picked.total_price),
      currency: picked.base_currency || picked.currency || "USD",
      display_currency: displayCurrency,
      contact: { name: `${passenger.firstName} ${passenger.lastName}`, email: passenger.email, phone: passenger.phone },
      payload: {
        quote_id: picked.id,
        vehicle_class: picked.vehicle_class,
        vehicle_description: picked.vehicle_description,
        provider_name: picked.provider_name,
        pickup_address: searchMeta.pickup_address,
        dropoff_address: searchMeta.dropoff_address,
        pickup_datetime: searchMeta.pickup_datetime,
        num_passengers: searchMeta.num_passengers,
        passenger,
        flight_number: String(fd.get("flight_number") || ""),
        special_instructions: String(fd.get("special_instructions") || ""),
        provider_amount: picked.base_price ?? picked.total_price,
      },
    });
  }

  if (done) {
    return <ConfirmationScreen {...done} vertical="transfers" fulfillment="manual" onReset={() => { setDone(null); setQuotes([]); setPicked(null); setCheckoutInput(null); }} />;
  }
  if (checkout) {
    return <GuestCheckout input={checkout} onCancel={() => setCheckoutInput(null)} onSuccess={(r) => { setDone(r); setCheckoutInput(null); }} />;
  }

  const routeLabel = searchMeta ? `${searchMeta.pickup_address.split(",")[0]} → ${searchMeta.dropoff_address.split(",")[0]}` : "";

  return (
    <>
      <TransferSearchForm busy={busy} onSubmit={search} />

      {busy && <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching live transfer rates…</div>}

      {!picked && quotes.length > 0 && searchMeta && (
        <TransferResults
          quotes={quotes}
          routeLabel={routeLabel}
          passengers={searchMeta.num_passengers}
          format={format}
          onSelect={(q) => setPicked(q)}
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
              <h3 className="font-display text-base font-bold text-primary">Lead passenger details</h3>
              <p className="text-xs text-muted-foreground">{picked.vehicle_description} · {searchMeta.num_passengers} passenger{searchMeta.num_passengers > 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-lg font-extrabold text-primary">{format(Number(picked.total_price), picked.currency)}</div>
            </div>
          </div>
          <Field label="First name"><input name="first_name" required className={inputCls} /></Field>
          <Field label="Last name"><input name="last_name" required className={inputCls} /></Field>
          <Field label="Email (confirmation destination)"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" required placeholder="+234 800 000 0000" className={inputCls} /></Field>
          <Field label="Flight number (optional)"><input name="flight_number" placeholder="e.g. BA178" className={inputCls} /></Field>
          <Field label="Special instructions (optional)"><input name="special_instructions" placeholder="Child seat, extra luggage…" className={inputCls} /></Field>
          <div className="col-span-full rounded-md bg-surface p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Heads up:</strong> Transfer reservations are confirmed within a few hours by our ops team. You'll receive driver details and a contact number by email before pickup.
          </div>
          <div className="col-span-full flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Back to results</button>
            <button type="submit" className="btn-glow rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Continue to payment</button>
          </div>
        </form>
      )}
    </>
  );
}

function InsuranceFlow() {
  const { currency: displayCurrency, format } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [quotes, setQuotes] = useState<InsuranceQuote[]>([]);
  const [searchMeta, setSearchMeta] = useState<InsuranceSearchPayload | null>(null);
  const [picked, setPicked] = useState<InsuranceQuote | null>(null);
  const [checkout, setCheckoutInput] = useState<CheckoutInput | null>(null);
  const [done, setDone] = useState<{ reference: string; amount: number; currency: string } | null>(null);

  async function search(payload: InsuranceSearchPayload) {
    setSearchMeta(payload);
    setBusy(true); setQuotes([]); setPicked(null); setCheckoutInput(null); setDone(null);
    try {
      const json = await publicSearchInsurance({ data: {
        nationality: payload.nationality,
        destination: payload.destination,
        start_date: payload.start_date,
        end_date: payload.end_date,
        travelers: payload.travelers,
        coverage_type: payload.coverage_type,
        display_currency: displayCurrency,
      } });
      const parsed = JSON.parse(json) as { quotes: InsuranceQuote[]; error?: string };
      setQuotes(parsed.quotes || []);
      if (parsed.error) toast.error(parsed.error);
      else if (!parsed.quotes?.length) toast.message("No plans available for that combination");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function startCheckout(form: HTMLFormElement) {
    if (!picked || !searchMeta) return;
    const fd = new FormData(form);
    const policyholder = {
      firstName: String(fd.get("first_name")),
      lastName: String(fd.get("last_name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone")),
      dateOfBirth: String(fd.get("dob")),
      nationality: searchMeta.nationality,
    };
    setCheckoutInput({
      vertical: "insurance",
      base_amount: Number(picked.base_price ?? picked.price),
      currency: picked.base_currency || picked.currency || "USD",
      display_currency: displayCurrency,
      contact: { name: `${policyholder.firstName} ${policyholder.lastName}`, email: policyholder.email, phone: policyholder.phone },
      payload: {
        quote_id: picked.id,
        plan_name: picked.plan_name,
        coverage_type: picked.coverage_type,
        duration_days: picked.duration_days,
        nationality: searchMeta.nationality,
        nationality_name: searchMeta.nationality_name,
        destination: searchMeta.destination,
        destination_name: searchMeta.destination_name,
        start_date: searchMeta.start_date,
        end_date: searchMeta.end_date,
        travelers: searchMeta.travelers,
        policyholder,
        provider_amount: picked.base_price ?? picked.price,
      },
    });
  }

  if (done) {
    return <ConfirmationScreen {...done} vertical="insurance" fulfillment="manual" onReset={() => { setDone(null); setQuotes([]); setPicked(null); setCheckoutInput(null); }} />;
  }
  if (checkout) {
    return <GuestCheckout input={checkout} onCancel={() => setCheckoutInput(null)} onSuccess={(r) => { setDone(r); setCheckoutInput(null); }} />;
  }

  const totalTravelers = searchMeta?.travelers.length ?? 0;

  return (
    <>
      <InsuranceSearchForm busy={busy} onSubmit={search} />

      {busy && <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Pricing your cover…</div>}

      {!picked && quotes.length > 0 && searchMeta && (
        <InsuranceResults
          quotes={quotes}
          travelersCount={totalTravelers}
          destinationLabel={searchMeta.destination_name}
          format={format}
          onSelect={(q) => setPicked(q)}
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
              <h3 className="font-display text-base font-bold text-primary">Policyholder details</h3>
              <p className="text-xs text-muted-foreground">{picked.plan_name} · {totalTravelers} traveler{totalTravelers > 1 ? "s" : ""} · {picked.duration_days} day{picked.duration_days !== 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-lg font-extrabold text-primary">{format(Number(picked.price), picked.currency)}</div>
            </div>
          </div>
          <Field label="First name"><input name="first_name" required className={inputCls} /></Field>
          <Field label="Last name"><input name="last_name" required className={inputCls} /></Field>
          <Field label="Date of birth"><input name="dob" type="date" required className={inputCls} /></Field>
          <Field label="Email (policy destination)"><input name="email" type="email" required className={inputCls} /></Field>
          <Field label="Phone"><input name="phone" required placeholder="+234 800 000 0000" className={inputCls} /></Field>
          <div className="col-span-full rounded-md bg-surface p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Heads up:</strong> Your policy is bound by our ops team within a few hours of payment. The policy PDF and member ID will be emailed to you. Coverage starts on {picked.duration_days > 0 ? searchMeta.start_date : "your selected start date"}.
          </div>
          <div className="col-span-full flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Back to plans</button>
            <button type="submit" className="btn-glow rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Continue to payment</button>
          </div>
        </form>
      )}
    </>
  );
}
