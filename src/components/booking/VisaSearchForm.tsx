import { useEffect, useState } from "react";
import { Loader2, Search, Globe2 } from "lucide-react";
import { FieldLabel } from "@/components/booking/SearchForm";
import { listVisaCorridors } from "@/server/visa-products.functions";

export type VisaSearchPayload = {
  nationality: string;
  nationality_name: string;
  destination: string;
  destination_name: string;
};

export function VisaSearchForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (payload: VisaSearchPayload) => void | Promise<void>;
}) {
  const [nationalities, setNationalities] = useState<{ code: string; name: string }[]>([]);
  const [destinations, setDestinations] = useState<{ code: string; name: string }[]>([]);
  const [nationality, setNationality] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVisaCorridors()
      .then((res) => {
        setNationalities(res.nationalities);
        setDestinations(res.destinations);
        if (res.nationalities[0]) setNationality(res.nationalities[0].code);
      })
      .finally(() => setLoading(false));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nationality) { alert("Please select your nationality."); return; }
    const nat = nationalities.find((n) => n.code === nationality);
    const dest = destination ? destinations.find((d) => d.code === destination) : undefined;
    onSubmit({
      nationality,
      nationality_name: nat?.name ?? nationality,
      destination: destination,
      destination_name: dest?.name ?? "Any destination",
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-12"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="sm:col-span-5">
        <FieldLabel>Your nationality</FieldLabel>
        <div className="relative">
          <Globe2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            disabled={loading}
            required
            className="h-11 w-full appearance-none rounded-md border border-border bg-white pl-8 pr-3 text-sm"
          >
            {loading && <option>Loading…</option>}
            {!loading && nationalities.length === 0 && <option value="">No corridors available</option>}
            {nationalities.map((n) => (
              <option key={n.code} value={n.code}>{n.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sm:col-span-5">
        <FieldLabel>Destination (optional)</FieldLabel>
        <div className="relative">
          <Globe2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            disabled={loading}
            className="h-11 w-full appearance-none rounded-md border border-border bg-white pl-8 pr-3 text-sm"
          >
            <option value="">All destinations</option>
            {destinations.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>&nbsp;</FieldLabel>
        <button
          type="submit"
          disabled={busy || loading}
          className="btn-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? "Searching…" : "Find visas"}
        </button>
      </div>
    </form>
  );
}
