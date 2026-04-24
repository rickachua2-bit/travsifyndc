import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { FieldLabel } from "@/components/booking/SearchForm";
import { CountryInput } from "@/components/booking/CountryInput";
import { findCountryByCode } from "@/data/countries";

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
  const [nationality, setNationality] = useState("");
  const [destination, setDestination] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nationality) { alert("Please select your nationality."); return; }
    if (!destination) { alert("Please select your destination."); return; }
    if (nationality === destination) { alert("Destination must be different from your nationality."); return; }
    const nat = findCountryByCode(nationality);
    const dest = findCountryByCode(destination);
    onSubmit({
      nationality,
      nationality_name: nat?.name ?? nationality,
      destination,
      destination_name: dest?.name ?? destination,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-12"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="sm:col-span-5">
        <CountryInput
          label="Your nationality"
          value={nationality}
          onChange={setNationality}
          placeholder="e.g. Nigeria, India, Brazil"
        />
      </div>

      <div className="sm:col-span-5">
        <CountryInput
          label="Destination"
          value={destination}
          onChange={setDestination}
          placeholder="Where are you travelling to?"
        />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel>&nbsp;</FieldLabel>
        <button
          type="submit"
          disabled={busy}
          className="btn-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {busy ? "Searching…" : "Find visas"}
        </button>
      </div>
    </form>
  );
}
