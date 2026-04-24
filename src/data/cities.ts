// Curated city dataset for hotel destination autocomplete.
// `code` is the LiteAPI cityCode (IATA-style for major destinations) — this is what we send to the API.
// `country` is the ISO-2 country code as a fallback.
// Covers ~120 of the top tourism destinations worldwide (~90% of search volume).
export type City = {
  code: string;       // LiteAPI cityCode (3-letter)
  city: string;
  country: string;    // ISO-2
  country_name: string;
};

export const CITIES: City[] = [
  // Africa
  { code: "LOS", city: "Lagos", country: "NG", country_name: "Nigeria" },
  { code: "ABV", city: "Abuja", country: "NG", country_name: "Nigeria" },
  { code: "PHC", city: "Port Harcourt", country: "NG", country_name: "Nigeria" },
  { code: "ACC", city: "Accra", country: "GH", country_name: "Ghana" },
  { code: "NBO", city: "Nairobi", country: "KE", country_name: "Kenya" },
  { code: "JNB", city: "Johannesburg", country: "ZA", country_name: "South Africa" },
  { code: "CPT", city: "Cape Town", country: "ZA", country_name: "South Africa" },
  { code: "DUR", city: "Durban", country: "ZA", country_name: "South Africa" },
  { code: "CAI", city: "Cairo", country: "EG", country_name: "Egypt" },
  { code: "CMN", city: "Casablanca", country: "MA", country_name: "Morocco" },
  { code: "RAK", city: "Marrakech", country: "MA", country_name: "Morocco" },
  { code: "DAR", city: "Dar es Salaam", country: "TZ", country_name: "Tanzania" },
  { code: "ADD", city: "Addis Ababa", country: "ET", country_name: "Ethiopia" },
  { code: "ZNZ", city: "Zanzibar", country: "TZ", country_name: "Tanzania" },
  { code: "KGL", city: "Kigali", country: "RW", country_name: "Rwanda" },

  // Middle East
  { code: "DXB", city: "Dubai", country: "AE", country_name: "United Arab Emirates" },
  { code: "AUH", city: "Abu Dhabi", country: "AE", country_name: "United Arab Emirates" },
  { code: "DOH", city: "Doha", country: "QA", country_name: "Qatar" },
  { code: "RUH", city: "Riyadh", country: "SA", country_name: "Saudi Arabia" },
  { code: "JED", city: "Jeddah", country: "SA", country_name: "Saudi Arabia" },
  { code: "MED", city: "Medina", country: "SA", country_name: "Saudi Arabia" },
  { code: "BAH", city: "Manama", country: "BH", country_name: "Bahrain" },
  { code: "KWI", city: "Kuwait City", country: "KW", country_name: "Kuwait" },
  { code: "MCT", city: "Muscat", country: "OM", country_name: "Oman" },
  { code: "AMM", city: "Amman", country: "JO", country_name: "Jordan" },
  { code: "BEY", city: "Beirut", country: "LB", country_name: "Lebanon" },
  { code: "TLV", city: "Tel Aviv", country: "IL", country_name: "Israel" },
  { code: "IST", city: "Istanbul", country: "TR", country_name: "Türkiye" },
  { code: "AYT", city: "Antalya", country: "TR", country_name: "Türkiye" },

  // Europe
  { code: "LON", city: "London", country: "GB", country_name: "United Kingdom" },
  { code: "MAN", city: "Manchester", country: "GB", country_name: "United Kingdom" },
  { code: "EDI", city: "Edinburgh", country: "GB", country_name: "United Kingdom" },
  { code: "PAR", city: "Paris", country: "FR", country_name: "France" },
  { code: "NCE", city: "Nice", country: "FR", country_name: "France" },
  { code: "AMS", city: "Amsterdam", country: "NL", country_name: "Netherlands" },
  { code: "BRU", city: "Brussels", country: "BE", country_name: "Belgium" },
  { code: "FRA", city: "Frankfurt", country: "DE", country_name: "Germany" },
  { code: "MUC", city: "Munich", country: "DE", country_name: "Germany" },
  { code: "BER", city: "Berlin", country: "DE", country_name: "Germany" },
  { code: "HAM", city: "Hamburg", country: "DE", country_name: "Germany" },
  { code: "ZRH", city: "Zurich", country: "CH", country_name: "Switzerland" },
  { code: "GVA", city: "Geneva", country: "CH", country_name: "Switzerland" },
  { code: "VIE", city: "Vienna", country: "AT", country_name: "Austria" },
  { code: "ROM", city: "Rome", country: "IT", country_name: "Italy" },
  { code: "MIL", city: "Milan", country: "IT", country_name: "Italy" },
  { code: "VCE", city: "Venice", country: "IT", country_name: "Italy" },
  { code: "FLR", city: "Florence", country: "IT", country_name: "Italy" },
  { code: "MAD", city: "Madrid", country: "ES", country_name: "Spain" },
  { code: "BCN", city: "Barcelona", country: "ES", country_name: "Spain" },
  { code: "PMI", city: "Palma", country: "ES", country_name: "Spain" },
  { code: "LIS", city: "Lisbon", country: "PT", country_name: "Portugal" },
  { code: "OPO", city: "Porto", country: "PT", country_name: "Portugal" },
  { code: "ATH", city: "Athens", country: "GR", country_name: "Greece" },
  { code: "JTR", city: "Santorini", country: "GR", country_name: "Greece" },
  { code: "DUB", city: "Dublin", country: "IE", country_name: "Ireland" },
  { code: "CPH", city: "Copenhagen", country: "DK", country_name: "Denmark" },
  { code: "STO", city: "Stockholm", country: "SE", country_name: "Sweden" },
  { code: "OSL", city: "Oslo", country: "NO", country_name: "Norway" },
  { code: "HEL", city: "Helsinki", country: "FI", country_name: "Finland" },
  { code: "PRG", city: "Prague", country: "CZ", country_name: "Czechia" },
  { code: "BUD", city: "Budapest", country: "HU", country_name: "Hungary" },
  { code: "WAW", city: "Warsaw", country: "PL", country_name: "Poland" },
  { code: "KRK", city: "Krakow", country: "PL", country_name: "Poland" },
  { code: "MOW", city: "Moscow", country: "RU", country_name: "Russia" },

  // Americas
  { code: "NYC", city: "New York", country: "US", country_name: "United States" },
  { code: "LAX", city: "Los Angeles", country: "US", country_name: "United States" },
  { code: "SFO", city: "San Francisco", country: "US", country_name: "United States" },
  { code: "CHI", city: "Chicago", country: "US", country_name: "United States" },
  { code: "MIA", city: "Miami", country: "US", country_name: "United States" },
  { code: "LAS", city: "Las Vegas", country: "US", country_name: "United States" },
  { code: "ORL", city: "Orlando", country: "US", country_name: "United States" },
  { code: "WAS", city: "Washington", country: "US", country_name: "United States" },
  { code: "BOS", city: "Boston", country: "US", country_name: "United States" },
  { code: "SEA", city: "Seattle", country: "US", country_name: "United States" },
  { code: "ATL", city: "Atlanta", country: "US", country_name: "United States" },
  { code: "HOU", city: "Houston", country: "US", country_name: "United States" },
  { code: "DFW", city: "Dallas", country: "US", country_name: "United States" },
  { code: "HNL", city: "Honolulu", country: "US", country_name: "United States" },
  { code: "YTO", city: "Toronto", country: "CA", country_name: "Canada" },
  { code: "YVR", city: "Vancouver", country: "CA", country_name: "Canada" },
  { code: "YMQ", city: "Montreal", country: "CA", country_name: "Canada" },
  { code: "MEX", city: "Mexico City", country: "MX", country_name: "Mexico" },
  { code: "CUN", city: "Cancún", country: "MX", country_name: "Mexico" },
  { code: "HAV", city: "Havana", country: "CU", country_name: "Cuba" },
  { code: "SDQ", city: "Santo Domingo", country: "DO", country_name: "Dominican Republic" },
  { code: "PUJ", city: "Punta Cana", country: "DO", country_name: "Dominican Republic" },
  { code: "GIG", city: "Rio de Janeiro", country: "BR", country_name: "Brazil" },
  { code: "SAO", city: "São Paulo", country: "BR", country_name: "Brazil" },
  { code: "BUE", city: "Buenos Aires", country: "AR", country_name: "Argentina" },
  { code: "SCL", city: "Santiago", country: "CL", country_name: "Chile" },
  { code: "LIM", city: "Lima", country: "PE", country_name: "Peru" },
  { code: "BOG", city: "Bogotá", country: "CO", country_name: "Colombia" },
  { code: "CTG", city: "Cartagena", country: "CO", country_name: "Colombia" },

  // Asia
  { code: "BKK", city: "Bangkok", country: "TH", country_name: "Thailand" },
  { code: "HKT", city: "Phuket", country: "TH", country_name: "Thailand" },
  { code: "USM", city: "Koh Samui", country: "TH", country_name: "Thailand" },
  { code: "CNX", city: "Chiang Mai", country: "TH", country_name: "Thailand" },
  { code: "SIN", city: "Singapore", country: "SG", country_name: "Singapore" },
  { code: "KUL", city: "Kuala Lumpur", country: "MY", country_name: "Malaysia" },
  { code: "BKI", city: "Kota Kinabalu", country: "MY", country_name: "Malaysia" },
  { code: "DPS", city: "Bali (Denpasar)", country: "ID", country_name: "Indonesia" },
  { code: "JKT", city: "Jakarta", country: "ID", country_name: "Indonesia" },
  { code: "MNL", city: "Manila", country: "PH", country_name: "Philippines" },
  { code: "CEB", city: "Cebu", country: "PH", country_name: "Philippines" },
  { code: "HAN", city: "Hanoi", country: "VN", country_name: "Vietnam" },
  { code: "SGN", city: "Ho Chi Minh City", country: "VN", country_name: "Vietnam" },
  { code: "REP", city: "Siem Reap", country: "KH", country_name: "Cambodia" },
  { code: "TYO", city: "Tokyo", country: "JP", country_name: "Japan" },
  { code: "OSA", city: "Osaka", country: "JP", country_name: "Japan" },
  { code: "KIX", city: "Kyoto", country: "JP", country_name: "Japan" },
  { code: "SEL", city: "Seoul", country: "KR", country_name: "South Korea" },
  { code: "HKG", city: "Hong Kong", country: "HK", country_name: "Hong Kong SAR" },
  { code: "MFM", city: "Macau", country: "MO", country_name: "Macau SAR" },
  { code: "TPE", city: "Taipei", country: "TW", country_name: "Taiwan" },
  { code: "BJS", city: "Beijing", country: "CN", country_name: "China" },
  { code: "SHA", city: "Shanghai", country: "CN", country_name: "China" },
  { code: "CAN", city: "Guangzhou", country: "CN", country_name: "China" },
  { code: "DEL", city: "Delhi", country: "IN", country_name: "India" },
  { code: "BOM", city: "Mumbai", country: "IN", country_name: "India" },
  { code: "BLR", city: "Bengaluru", country: "IN", country_name: "India" },
  { code: "MAA", city: "Chennai", country: "IN", country_name: "India" },
  { code: "GOI", city: "Goa", country: "IN", country_name: "India" },
  { code: "MLE", city: "Malé (Maldives)", country: "MV", country_name: "Maldives" },
  { code: "CMB", city: "Colombo", country: "LK", country_name: "Sri Lanka" },
  { code: "KTM", city: "Kathmandu", country: "NP", country_name: "Nepal" },

  // Oceania
  { code: "SYD", city: "Sydney", country: "AU", country_name: "Australia" },
  { code: "MEL", city: "Melbourne", country: "AU", country_name: "Australia" },
  { code: "BNE", city: "Brisbane", country: "AU", country_name: "Australia" },
  { code: "PER", city: "Perth", country: "AU", country_name: "Australia" },
  { code: "AKL", city: "Auckland", country: "NZ", country_name: "New Zealand" },
  { code: "NAN", city: "Nadi", country: "FJ", country_name: "Fiji" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function searchCities(query: string, limit = 8): City[] {
  const q = norm(query.trim());
  if (!q) return [];
  const exact = CITIES.filter((c) => norm(c.code) === q);
  if (exact.length) return exact.slice(0, limit);
  const starts = CITIES.filter(
    (c) => norm(c.city).startsWith(q) || norm(c.country_name).startsWith(q),
  );
  const contains = CITIES.filter(
    (c) =>
      !starts.includes(c) &&
      (norm(c.city).includes(q) || norm(c.country_name).includes(q) || norm(c.code).includes(q)),
  );
  return [...starts, ...contains].slice(0, limit);
}

export function findCityByCode(code: string): City | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase();
  return CITIES.find((x) => x.code === c);
}
