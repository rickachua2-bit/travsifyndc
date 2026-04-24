import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plane, Hotel, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { searchFlightsInternal, searchHotelsInternal, bookFlightFromWallet, bookHotelFromWallet } from "@/server/dashboard.functions";
import { PartnerShell } from "@/components/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/book")({
  component: BookPage,
  head: () => ({ meta: [{ title: "Book — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

type FlightOffer = { id: string; total_amount: string; total_currency: string; owner?: string; slices?: Array<{ origin?: string; destination?: string; segments?: Array<{ departing_at?: string; arriving_at?: string; marketing_carrier?: string; flight_number?: string }> }> };
type HotelOffer = { id: string; name?: string; address?: string; stars?: number; photo?: string; offer_id?: string; price?: number; currency?: string };

function BookPage() {
  const [tab, setTab] = useState<"flights" | "hotels">("flights");
  return (
    <PartnerShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="font-display text-3xl font-extrabold text-primary">Book — pay from wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search live inventory and pay instantly from your USD or NGN wallet.</p>

        <div className="mt-6 inline-flex rounded-lg border border-border bg-white p-1">
          <button onClick={() => setTab("flights")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${tab === "flights" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Plane className="h-3 w-3" /> Flights</button>
          <button onClick={() => setTab("hotels")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${tab === "hotels" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Hotel className="h-3 w-3" /> Hotels</button>
        </div>

        {tab === "flights" ? <FlightsPanel /> : <HotelsPanel />}
      </div>
    </PartnerShell>
  );
}

function FlightsPanel() {
  const [busy, setBusy] = useState(false);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [picked, setPicked] = useState<FlightOffer | null>(null);

  async function search(form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true); setOffers([]); setPicked(null);
    try {
      const json = await searchFlightsInternal({ data: {
        origin: String(fd.get("origin")).toUpperCase(),
        destination: String(fd.get("destination")).toUpperCase(),
        departure_date: String(fd.get("departure_date")),
        return_date: (fd.get("return_date") as string) || undefined,
        adults: Number(fd.get("adults") || 1),
      } });
      const parsed = JSON.parse(json) as { offers: FlightOffer[] };
      setOffers(parsed.offers || []);
      if ((parsed.offers || []).length === 0) toast.message("No flights found");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function book(form: HTMLFormElement) {
    if (!picked) return;
    const fd = new FormData(form);
    try {
      await bookFlightFromWallet({ data: {
        offer_id: picked.id,
        amount: Number(picked.total_amount),
        currency: (picked.total_currency as "USD" | "NGN"),
        passengers: [{
          given_name: String(fd.get("given_name")),
          family_name: String(fd.get("family_name")),
          born_on: String(fd.get("born_on")),
          gender: fd.get("gender") as "m" | "f",
          title: fd.get("title") as "mr" | "ms" | "mrs" | "miss" | "dr",
          email: String(fd.get("email")),
          phone_number: String(fd.get("phone_number")),
        }],
      } });
      toast.success("Flight confirmed — see Bookings.");
      setPicked(null); setOffers([]);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); search(e.currentTarget); }} className="mt-4 grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-6" style={{ boxShadow: "var(--shadow-soft)" }}>
        <input name="origin" required maxLength={3} placeholder="LOS" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm uppercase" />
        <input name="destination" required maxLength={3} placeholder="DXB" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm uppercase" />
        <input name="departure_date" type="date" required className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
        <input name="return_date" type="date" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
        <input name="adults" type="number" min={1} max={8} defaultValue={1} className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
        <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Search</button>
      </form>

      {offers.length > 0 && !picked && (
        <div className="mt-6 space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div>
                <div className="font-display text-sm font-bold text-primary">{o.owner}</div>
                <div className="text-xs text-muted-foreground">
                  {o.slices?.[0]?.segments?.map((s) => `${s.marketing_carrier}${s.flight_number} ${new Date(s.departing_at || "").toLocaleString()} → ${new Date(s.arriving_at || "").toLocaleString()}`).join("  •  ")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-extrabold text-primary">{o.total_currency} {Number(o.total_amount).toLocaleString()}</div>
                <button onClick={() => setPicked(o)} className="mt-1 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Select</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {picked && (
        <form onSubmit={(e) => { e.preventDefault(); book(e.currentTarget); }} className="mt-6 grid gap-2 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="col-span-full font-display text-base font-bold text-primary">Passenger details · Pay {picked.total_currency} {Number(picked.total_amount).toLocaleString()} from wallet</h3>
          <select name="title" required className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"><option value="mr">Mr</option><option value="ms">Ms</option><option value="mrs">Mrs</option><option value="miss">Miss</option><option value="dr">Dr</option></select>
          <select name="gender" required className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"><option value="m">Male</option><option value="f">Female</option></select>
          <input name="given_name" required placeholder="Given name" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <input name="family_name" required placeholder="Family name" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <input name="born_on" type="date" required className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <input name="phone_number" required placeholder="+234 800 000 0000" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <div className="col-span-full flex gap-2"><button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold">Back</button><button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Confirm & pay</button></div>
        </form>
      )}
    </>
  );
}

function HotelsPanel() {
  const [busy, setBusy] = useState(false);
  const [offers, setOffers] = useState<HotelOffer[]>([]);
  const [picked, setPicked] = useState<HotelOffer | null>(null);

  async function search(form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true); setOffers([]); setPicked(null);
    try {
      const json = await searchHotelsInternal({ data: {
        country_code: String(fd.get("country_code")).toUpperCase(),
        checkin: String(fd.get("checkin")),
        checkout: String(fd.get("checkout")),
        adults: Number(fd.get("adults") || 2),
        currency: "USD",
      } });
      const parsed = JSON.parse(json) as { hotels: HotelOffer[] };
      const valid = (parsed.hotels || []).filter((h) => h.offer_id && h.price);
      setOffers(valid);
      if (valid.length === 0) toast.message("No hotels found");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function book(form: HTMLFormElement) {
    if (!picked?.offer_id || !picked.price) return;
    const fd = new FormData(form);
    try {
      await bookHotelFromWallet({ data: {
        offer_id: picked.offer_id,
        amount: picked.price,
        currency: (picked.currency as "USD" | "NGN") || "USD",
        holder: { firstName: String(fd.get("firstName")), lastName: String(fd.get("lastName")), email: String(fd.get("email")) },
        guests: [{ firstName: String(fd.get("firstName")), lastName: String(fd.get("lastName")), email: String(fd.get("email")) }],
      } });
      toast.success("Hotel confirmed — see Bookings.");
      setPicked(null); setOffers([]);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); search(e.currentTarget); }} className="mt-4 grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-5" style={{ boxShadow: "var(--shadow-soft)" }}>
        <input name="country_code" required maxLength={2} placeholder="AE" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm uppercase" />
        <input name="checkin" type="date" required className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
        <input name="checkout" type="date" required className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
        <input name="adults" type="number" min={1} max={8} defaultValue={2} className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
        <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Search</button>
      </form>

      {offers.length > 0 && !picked && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {offers.map((h) => (
            <div key={h.id} className="rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              {h.photo && <img src={h.photo} alt={h.name} className="mb-3 h-32 w-full rounded-lg object-cover" />}
              <div className="font-display text-sm font-bold text-primary">{h.name} {h.stars ? <span className="text-amber-500">{"★".repeat(h.stars)}</span> : null}</div>
              <div className="text-xs text-muted-foreground">{h.address}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="font-display text-lg font-extrabold text-primary">{h.currency} {Number(h.price).toLocaleString()}</div>
                <button onClick={() => setPicked(h)} className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Select</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {picked && (
        <form onSubmit={(e) => { e.preventDefault(); book(e.currentTarget); }} className="mt-6 grid gap-2 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="col-span-full font-display text-base font-bold text-primary">Guest details · Pay {picked.currency} {Number(picked.price).toLocaleString()} from wallet</h3>
          <input name="firstName" required placeholder="First name" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <input name="lastName" required placeholder="Last name" className="rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="col-span-full rounded-md border border-border bg-white px-2 py-1.5 text-sm" />
          <div className="col-span-full flex gap-2"><button type="button" onClick={() => setPicked(null)} className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold">Back</button><button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Confirm & pay</button></div>
        </form>
      )}
    </>
  );
}
