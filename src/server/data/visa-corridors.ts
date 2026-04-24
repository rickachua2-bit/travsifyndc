/**
 * Curated list of high-demand visa corridors to seed via Sherpa scrape.
 * Each entry maps to one Sherpa product page URL pattern:
 *   https://apply.joinsherpa.com/visa/{destination_slug}/{nationality_demonym}-citizens
 *
 * ISO-2 codes are stored on visa_products. nationality_name and destination_name
 * are human-readable display names used in the UI.
 */
export type Corridor = {
  nationality_iso2: string;
  nationality_name: string;
  nationality_demonym: string; // used in URL: "nigerian", "kenyan", etc.
  destination_iso2: string;
  destination_name: string;
  destination_slug: string;    // used in URL: "united-arab-emirates"
};

// Source markets — African + South Asian travellers (highest e-visa demand)
const SOURCES: Array<Omit<Corridor, "destination_iso2" | "destination_name" | "destination_slug">> = [
  { nationality_iso2: "NG", nationality_name: "Nigeria",     nationality_demonym: "nigerian" },
  { nationality_iso2: "GH", nationality_name: "Ghana",       nationality_demonym: "ghanaian" },
  { nationality_iso2: "KE", nationality_name: "Kenya",       nationality_demonym: "kenyan" },
  { nationality_iso2: "ZA", nationality_name: "South Africa",nationality_demonym: "south-african" },
  { nationality_iso2: "EG", nationality_name: "Egypt",       nationality_demonym: "egyptian" },
  { nationality_iso2: "IN", nationality_name: "India",       nationality_demonym: "indian" },
  { nationality_iso2: "PH", nationality_name: "Philippines", nationality_demonym: "filipino" },
  { nationality_iso2: "PK", nationality_name: "Pakistan",    nationality_demonym: "pakistani" },
  { nationality_iso2: "BD", nationality_name: "Bangladesh",  nationality_demonym: "bangladeshi" },
];

// Top destinations our partners send travellers to
const DESTINATIONS: Array<Pick<Corridor, "destination_iso2" | "destination_name" | "destination_slug">> = [
  { destination_iso2: "AE", destination_name: "United Arab Emirates", destination_slug: "united-arab-emirates" },
  { destination_iso2: "GB", destination_name: "United Kingdom",       destination_slug: "united-kingdom" },
  { destination_iso2: "US", destination_name: "United States",        destination_slug: "united-states" },
  { destination_iso2: "CA", destination_name: "Canada",               destination_slug: "canada" },
  { destination_iso2: "TR", destination_name: "Turkey",               destination_slug: "turkey" },
  { destination_iso2: "SA", destination_name: "Saudi Arabia",         destination_slug: "saudi-arabia" },
  { destination_iso2: "QA", destination_name: "Qatar",                destination_slug: "qatar" },
  { destination_iso2: "TH", destination_name: "Thailand",             destination_slug: "thailand" },
  { destination_iso2: "SG", destination_name: "Singapore",            destination_slug: "singapore" },
  { destination_iso2: "MY", destination_name: "Malaysia",             destination_slug: "malaysia" },
  { destination_iso2: "CN", destination_name: "China",                destination_slug: "china" },
  { destination_iso2: "DE", destination_name: "Germany",              destination_slug: "germany" },
  { destination_iso2: "FR", destination_name: "France",               destination_slug: "france" },
];

export const VISA_CORRIDORS: Corridor[] = SOURCES.flatMap((s) =>
  DESTINATIONS.map((d) => ({ ...s, ...d })),
);

export function buildSherpaUrl(c: Corridor): string {
  return `https://apply.joinsherpa.com/visa/${c.destination_slug}/${c.nationality_demonym}-citizens`;
}
