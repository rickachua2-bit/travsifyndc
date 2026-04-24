import { Plane, Building2, MapPin, Car, Globe2, Shield, KeyRound } from "lucide-react";

export type BookingVertical = "flights" | "hotels" | "tours" | "transfers" | "visas" | "insurance" | "car_rentals";

export const VERTICALS: { id: BookingVertical; label: string; icon: typeof Plane; tagline: string }[] = [
  { id: "flights", label: "Flights", icon: Plane, tagline: "500+ carriers, instant ticketing" },
  { id: "hotels", label: "Hotels", icon: Building2, tagline: "1.6M+ properties worldwide" },
  { id: "tours", label: "Tours & activities", icon: MapPin, tagline: "12k+ experiences in 150 countries" },
  { id: "transfers", label: "Airport transfers", icon: Car, tagline: "City and airport pickup, 130+ countries" },
  { id: "car_rentals", label: "Car rentals", icon: KeyRound, tagline: "Self-drive worldwide, free cancellation" },
  { id: "visas", label: "e-Visas", icon: Globe2, tagline: "Government-grade processing" },
  { id: "insurance", label: "Travel insurance", icon: Shield, tagline: "Medical, trip & nomad cover" },
];

/**
 * OTA-style icon-over-label tab strip (Skyscanner / Trip.com / mytrip).
 * Sits on top of the floating search card with an active underline accent.
 */
export function VerticalTabs({ value, onChange }: { value: BookingVertical; onChange: (v: BookingVertical) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Booking products"
      className="-mx-2 flex flex-nowrap gap-1 overflow-x-auto px-2 pb-1 sm:mx-0 sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {VERTICALS.map((v) => {
        const active = value === v.id;
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            className={`group relative flex flex-none flex-col items-center justify-center gap-1 rounded-t-xl px-4 py-3 text-[11px] font-semibold transition sm:flex-row sm:gap-2 sm:px-5 sm:text-xs ${
              active
                ? "bg-white text-primary"
                : "text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            <v.icon className={`h-5 w-5 sm:h-4 sm:w-4 ${active ? "text-accent" : ""}`} />
            <span className="whitespace-nowrap">{v.label}</span>
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-[2px] h-[3px] rounded-full bg-accent"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
