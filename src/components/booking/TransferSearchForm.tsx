import { useState } from "react";
import { Calendar, Clock, Loader2, MapPin, Search, Users } from "lucide-react";
import { FieldLabel } from "@/components/booking/SearchForm";

export type TransferSearchPayload = {
  pickup_address: string;
  dropoff_address: string;
  pickup_datetime: string; // ISO 8601
  pickup_date: string;
  pickup_time: string;
  num_passengers: number;
};

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function TransferSearchForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: TransferSearchPayload) => void | Promise<void>;
}) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState(todayPlus(3));
  const [time, setTime] = useState("10:00");
  const [passengers, setPassengers] = useState(2);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickup.trim()) { alert("Please enter a pickup address."); return; }
    if (!dropoff.trim()) { alert("Please enter a drop-off address."); return; }
    onSubmit({
      pickup_address: pickup.trim(),
      dropoff_address: dropoff.trim(),
      pickup_datetime: `${date}T${time}:00`,
      pickup_date: date,
      pickup_time: time,
      num_passengers: passengers,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-12"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="sm:col-span-4">
        <FieldLabel>Pickup</FieldLabel>
        <div className="relative mt-1">
          <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="e.g. JFK Airport, Terminal 4"
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-4">
        <FieldLabel>Drop-off</FieldLabel>
        <div className="relative mt-1">
          <MapPin className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="e.g. Times Square, Manhattan"
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>Date</FieldLabel>
        <div className="relative mt-1">
          <Calendar className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="date"
            value={date}
            min={todayPlus(0)}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-1">
        <FieldLabel>Time</FieldLabel>
        <div className="relative mt-1">
          <Clock className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-white pl-7 pr-1 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-1">
        <FieldLabel>Pax</FieldLabel>
        <div className="relative mt-1">
          <Users className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="number"
            value={passengers}
            min={1}
            max={20}
            onChange={(e) => setPassengers(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="h-11 w-full rounded-md border border-border bg-white pl-8 pr-1 text-sm"
            required
          />
        </div>
      </div>

      <div className="sm:col-span-12">
        <button
          type="submit"
          disabled={busy}
          className="btn-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? "Finding transfers…" : "Search airport transfers"}
        </button>
      </div>
    </form>
  );
}
