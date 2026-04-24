import { Plane, Building2, MapPin, Car, Globe2, Shield } from "lucide-react";

export type BookingVertical = "flights" | "hotels" | "tours" | "transfers" | "visas" | "insurance";

export const VERTICALS: { id: BookingVertical; label: string; icon: typeof Plane; tagline: string }[] = [
  { id: "flights", label: "Flights", icon: Plane, tagline: "500+ carriers, instant ticketing" },
  { id: "hotels", label: "Hotels", icon: Building2, tagline: "1.6M+ properties worldwide" },
  { id: "tours", label: "Tours & activities", icon: MapPin, tagline: "12k+ experiences in 150 countries" },
  { id: "transfers", label: "Airport transfers", icon: Car, tagline: "City and airport pickup, 130+ countries" },
  { id: "visas", label: "e-Visas", icon: Globe2, tagline: "Government-grade processing" },
  { id: "insurance", label: "Travel insurance", icon: Shield, tagline: "Medical, trip & nomad cover" },
];

export function VerticalTabs({ value, onChange }: { value: BookingVertical; onChange: (v: BookingVertical) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-white p-1.5">
      {VERTICALS.map((v) => {
        const active = value === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground"
            }`}
          >
            <v.icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
