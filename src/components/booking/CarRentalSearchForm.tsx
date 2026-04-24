import { useState } from "react";
import { Calendar, Loader2, Search, User } from "lucide-react";
import { FieldLabel } from "@/components/booking/SearchForm";
import { LocationInput } from "@/components/booking/LocationInput";

export type CarRentalSearchPayload = {
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  dropoff_date: string;
  driver_age: number;
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function CarRentalSearchForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: CarRentalSearchPayload) => void | Promise<void>;
}) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupDate, setPickupDate] = useState(todayPlus(7));
  const [dropoffDate, setDropoffDate] = useState(todayPlus(10));
  const [age, setAge] = useState(30);
  const [sameLocation, setSameLocation] = useState(true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup.trim()) { alert("Please enter a pickup location."); return; }
    if (new Date(dropoffDate) <= new Date(pickupDate)) { alert("Drop-off must be after pickup."); return; }
    onSubmit({
      pickup_location: pickup.trim(),
      dropoff_location: sameLocation ? pickup.trim() : (dropoff.trim() || pickup.trim()),
      pickup_date: pickupDate,
      dropoff_date: dropoffDate,
      driver_age: age,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-12"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className={sameLocation ? "sm:col-span-5" : "sm:col-span-3"}>
        <FieldLabel>Pickup location</FieldLabel>
        <div className="relative mt-1">
          <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="e.g. JFK Airport, New York"
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      {!sameLocation && (
        <div className="sm:col-span-3">
          <FieldLabel>Drop-off location</FieldLabel>
          <div className="relative mt-1">
            <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              placeholder="e.g. LAX Airport, Los Angeles"
              className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            />
          </div>
        </div>
      )}

      <div className="sm:col-span-2">
        <FieldLabel>Pickup date</FieldLabel>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={pickupDate}
            min={todayPlus(0)}
            onChange={(e) => setPickupDate(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Drop-off date</FieldLabel>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={dropoffDate}
            min={pickupDate}
            onChange={(e) => setDropoffDate(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-1">
        <FieldLabel>Age</FieldLabel>
        <div className="relative mt-1">
          <User className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="number"
            value={age}
            min={18}
            max={99}
            onChange={(e) => setAge(Math.max(18, Math.min(99, Number(e.target.value) || 30)))}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-1 text-sm"
            required
          />
        </div>
      </div>

      <label className="col-span-full flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={sameLocation} onChange={(e) => setSameLocation(e.target.checked)} />
        Return to same location
      </label>

      <div className="sm:col-span-12">
        <button
          type="submit"
          disabled={busy}
          className="btn-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? "Comparing rental cars…" : "Search rental cars"}
        </button>
      </div>
    </form>
  );
}
