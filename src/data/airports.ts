/**
 * Curated list of major world airports for the booking engine typeahead.
 * Covers top traffic airports across Africa, Europe, Middle East, Americas, Asia, Oceania.
 * Format: [IATA, name, city, country, country_code]
 */
export type Airport = {
  code: string;       // IATA
  name: string;       // Airport name
  city: string;       // City
  country: string;    // Country
  cc: string;         // ISO 3166-1 alpha-2
};

const RAW: Array<[string, string, string, string, string]> = [
  // Nigeria & West Africa
  ["LOS", "Murtala Muhammed International", "Lagos", "Nigeria", "NG"],
  ["ABV", "Nnamdi Azikiwe International", "Abuja", "Nigeria", "NG"],
  ["PHC", "Port Harcourt International", "Port Harcourt", "Nigeria", "NG"],
  ["KAN", "Mallam Aminu Kano International", "Kano", "Nigeria", "NG"],
  ["ENU", "Akanu Ibiam International", "Enugu", "Nigeria", "NG"],
  ["IBA", "Ibadan Airport", "Ibadan", "Nigeria", "NG"],
  ["ACC", "Kotoka International", "Accra", "Ghana", "GH"],
  ["ABJ", "Félix-Houphouët-Boigny International", "Abidjan", "Côte d'Ivoire", "CI"],
  ["DKR", "Blaise Diagne International", "Dakar", "Senegal", "SN"],
  ["COO", "Cadjehoun Airport", "Cotonou", "Benin", "BJ"],
  ["LFW", "Lomé–Tokoin Airport", "Lomé", "Togo", "TG"],
  ["FNA", "Lungi International", "Freetown", "Sierra Leone", "SL"],
  ["ROB", "Roberts International", "Monrovia", "Liberia", "LR"],
  ["BJL", "Banjul International", "Banjul", "Gambia", "GM"],
  ["DLA", "Douala International", "Douala", "Cameroon", "CM"],
  ["NSI", "Yaoundé Nsimalen International", "Yaoundé", "Cameroon", "CM"],
  // East Africa
  ["NBO", "Jomo Kenyatta International", "Nairobi", "Kenya", "KE"],
  ["MBA", "Moi International", "Mombasa", "Kenya", "KE"],
  ["ADD", "Bole International", "Addis Ababa", "Ethiopia", "ET"],
  ["DAR", "Julius Nyerere International", "Dar es Salaam", "Tanzania", "TZ"],
  ["ZNZ", "Abeid Amani Karume International", "Zanzibar", "Tanzania", "TZ"],
  ["EBB", "Entebbe International", "Kampala", "Uganda", "UG"],
  ["KGL", "Kigali International", "Kigali", "Rwanda", "RW"],
  ["MGQ", "Aden Adde International", "Mogadishu", "Somalia", "SO"],
  ["JIB", "Djibouti–Ambouli International", "Djibouti", "Djibouti", "DJ"],
  // Southern Africa
  ["JNB", "O. R. Tambo International", "Johannesburg", "South Africa", "ZA"],
  ["CPT", "Cape Town International", "Cape Town", "South Africa", "ZA"],
  ["DUR", "King Shaka International", "Durban", "South Africa", "ZA"],
  ["HRE", "Robert Gabriel Mugabe International", "Harare", "Zimbabwe", "ZW"],
  ["LUN", "Kenneth Kaunda International", "Lusaka", "Zambia", "ZM"],
  ["GBE", "Sir Seretse Khama International", "Gaborone", "Botswana", "BW"],
  ["WDH", "Hosea Kutako International", "Windhoek", "Namibia", "NA"],
  ["MPM", "Maputo International", "Maputo", "Mozambique", "MZ"],
  ["TNR", "Ivato International", "Antananarivo", "Madagascar", "MG"],
  ["MRU", "Sir Seewoosagur Ramgoolam International", "Port Louis", "Mauritius", "MU"],
  ["SEZ", "Seychelles International", "Mahé", "Seychelles", "SC"],
  // North Africa
  ["CAI", "Cairo International", "Cairo", "Egypt", "EG"],
  ["HRG", "Hurghada International", "Hurghada", "Egypt", "EG"],
  ["SSH", "Sharm El Sheikh International", "Sharm El Sheikh", "Egypt", "EG"],
  ["CMN", "Mohammed V International", "Casablanca", "Morocco", "MA"],
  ["RAK", "Marrakesh Menara", "Marrakesh", "Morocco", "MA"],
  ["TUN", "Tunis–Carthage International", "Tunis", "Tunisia", "TN"],
  ["ALG", "Houari Boumediene", "Algiers", "Algeria", "DZ"],
  ["TIP", "Tripoli International", "Tripoli", "Libya", "LY"],
  ["KRT", "Khartoum International", "Khartoum", "Sudan", "SD"],
  // Middle East
  ["DXB", "Dubai International", "Dubai", "United Arab Emirates", "AE"],
  ["AUH", "Abu Dhabi International", "Abu Dhabi", "United Arab Emirates", "AE"],
  ["SHJ", "Sharjah International", "Sharjah", "United Arab Emirates", "AE"],
  ["DOH", "Hamad International", "Doha", "Qatar", "QA"],
  ["RUH", "King Khalid International", "Riyadh", "Saudi Arabia", "SA"],
  ["JED", "King Abdulaziz International", "Jeddah", "Saudi Arabia", "SA"],
  ["MED", "Prince Mohammad Bin Abdulaziz", "Medina", "Saudi Arabia", "SA"],
  ["DMM", "King Fahd International", "Dammam", "Saudi Arabia", "SA"],
  ["KWI", "Kuwait International", "Kuwait City", "Kuwait", "KW"],
  ["BAH", "Bahrain International", "Manama", "Bahrain", "BH"],
  ["MCT", "Muscat International", "Muscat", "Oman", "OM"],
  ["AMM", "Queen Alia International", "Amman", "Jordan", "JO"],
  ["BEY", "Beirut–Rafic Hariri International", "Beirut", "Lebanon", "LB"],
  ["TLV", "Ben Gurion", "Tel Aviv", "Israel", "IL"],
  ["IST", "Istanbul Airport", "Istanbul", "Turkey", "TR"],
  ["SAW", "Sabiha Gökçen International", "Istanbul", "Turkey", "TR"],
  ["AYT", "Antalya Airport", "Antalya", "Turkey", "TR"],
  ["IKA", "Imam Khomeini International", "Tehran", "Iran", "IR"],
  ["BGW", "Baghdad International", "Baghdad", "Iraq", "IQ"],
  // UK & Ireland
  ["LHR", "Heathrow", "London", "United Kingdom", "GB"],
  ["LGW", "Gatwick", "London", "United Kingdom", "GB"],
  ["STN", "Stansted", "London", "United Kingdom", "GB"],
  ["LTN", "Luton", "London", "United Kingdom", "GB"],
  ["LCY", "London City", "London", "United Kingdom", "GB"],
  ["MAN", "Manchester Airport", "Manchester", "United Kingdom", "GB"],
  ["EDI", "Edinburgh Airport", "Edinburgh", "United Kingdom", "GB"],
  ["GLA", "Glasgow Airport", "Glasgow", "United Kingdom", "GB"],
  ["BHX", "Birmingham Airport", "Birmingham", "United Kingdom", "GB"],
  ["BRS", "Bristol Airport", "Bristol", "United Kingdom", "GB"],
  ["NCL", "Newcastle International", "Newcastle", "United Kingdom", "GB"],
  ["DUB", "Dublin Airport", "Dublin", "Ireland", "IE"],
  ["ORK", "Cork Airport", "Cork", "Ireland", "IE"],
  // Western Europe
  ["CDG", "Charles de Gaulle", "Paris", "France", "FR"],
  ["ORY", "Orly", "Paris", "France", "FR"],
  ["NCE", "Côte d'Azur", "Nice", "France", "FR"],
  ["LYS", "Lyon–Saint-Exupéry", "Lyon", "France", "FR"],
  ["MRS", "Marseille Provence", "Marseille", "France", "FR"],
  ["TLS", "Toulouse–Blagnac", "Toulouse", "France", "FR"],
  ["FRA", "Frankfurt Airport", "Frankfurt", "Germany", "DE"],
  ["MUC", "Munich Airport", "Munich", "Germany", "DE"],
  ["BER", "Berlin Brandenburg", "Berlin", "Germany", "DE"],
  ["DUS", "Düsseldorf Airport", "Düsseldorf", "Germany", "DE"],
  ["HAM", "Hamburg Airport", "Hamburg", "Germany", "DE"],
  ["CGN", "Cologne Bonn", "Cologne", "Germany", "DE"],
  ["STR", "Stuttgart Airport", "Stuttgart", "Germany", "DE"],
  ["AMS", "Schiphol", "Amsterdam", "Netherlands", "NL"],
  ["BRU", "Brussels Airport", "Brussels", "Belgium", "BE"],
  ["LUX", "Luxembourg Airport", "Luxembourg", "Luxembourg", "LU"],
  ["ZRH", "Zurich Airport", "Zurich", "Switzerland", "CH"],
  ["GVA", "Geneva Airport", "Geneva", "Switzerland", "CH"],
  ["VIE", "Vienna International", "Vienna", "Austria", "AT"],
  ["MAD", "Adolfo Suárez Madrid–Barajas", "Madrid", "Spain", "ES"],
  ["BCN", "Barcelona–El Prat", "Barcelona", "Spain", "ES"],
  ["AGP", "Málaga Airport", "Málaga", "Spain", "ES"],
  ["PMI", "Palma de Mallorca", "Palma", "Spain", "ES"],
  ["VLC", "Valencia Airport", "Valencia", "Spain", "ES"],
  ["LIS", "Humberto Delgado", "Lisbon", "Portugal", "PT"],
  ["OPO", "Francisco Sá Carneiro", "Porto", "Portugal", "PT"],
  ["FCO", "Leonardo da Vinci–Fiumicino", "Rome", "Italy", "IT"],
  ["MXP", "Milan Malpensa", "Milan", "Italy", "IT"],
  ["LIN", "Milan Linate", "Milan", "Italy", "IT"],
  ["VCE", "Venice Marco Polo", "Venice", "Italy", "IT"],
  ["NAP", "Naples International", "Naples", "Italy", "IT"],
  ["BLQ", "Bologna Guglielmo Marconi", "Bologna", "Italy", "IT"],
  ["ATH", "Athens International", "Athens", "Greece", "GR"],
  ["HER", "Heraklion International", "Heraklion", "Greece", "GR"],
  // Nordics
  ["CPH", "Copenhagen Airport", "Copenhagen", "Denmark", "DK"],
  ["ARN", "Stockholm Arlanda", "Stockholm", "Sweden", "SE"],
  ["GOT", "Göteborg Landvetter", "Gothenburg", "Sweden", "SE"],
  ["OSL", "Oslo Gardermoen", "Oslo", "Norway", "NO"],
  ["BGO", "Bergen Flesland", "Bergen", "Norway", "NO"],
  ["HEL", "Helsinki-Vantaa", "Helsinki", "Finland", "FI"],
  ["KEF", "Keflavík International", "Reykjavík", "Iceland", "IS"],
  // Eastern Europe
  ["WAW", "Warsaw Chopin", "Warsaw", "Poland", "PL"],
  ["KRK", "Kraków John Paul II", "Kraków", "Poland", "PL"],
  ["PRG", "Václav Havel Prague", "Prague", "Czech Republic", "CZ"],
  ["BUD", "Budapest Ferenc Liszt", "Budapest", "Hungary", "HU"],
  ["OTP", "Henri Coandă International", "Bucharest", "Romania", "RO"],
  ["SOF", "Sofia Airport", "Sofia", "Bulgaria", "BG"],
  ["BEG", "Belgrade Nikola Tesla", "Belgrade", "Serbia", "RS"],
  ["ZAG", "Zagreb Airport", "Zagreb", "Croatia", "HR"],
  ["KBP", "Kyiv Boryspil International", "Kyiv", "Ukraine", "UA"],
  ["SVO", "Sheremetyevo", "Moscow", "Russia", "RU"],
  ["DME", "Domodedovo", "Moscow", "Russia", "RU"],
  ["LED", "Pulkovo", "Saint Petersburg", "Russia", "RU"],
  // North America
  ["JFK", "John F. Kennedy International", "New York", "United States", "US"],
  ["LGA", "LaGuardia", "New York", "United States", "US"],
  ["EWR", "Newark Liberty International", "Newark", "United States", "US"],
  ["BOS", "Logan International", "Boston", "United States", "US"],
  ["IAD", "Washington Dulles International", "Washington", "United States", "US"],
  ["DCA", "Ronald Reagan Washington National", "Washington", "United States", "US"],
  ["ATL", "Hartsfield–Jackson Atlanta International", "Atlanta", "United States", "US"],
  ["MIA", "Miami International", "Miami", "United States", "US"],
  ["MCO", "Orlando International", "Orlando", "United States", "US"],
  ["FLL", "Fort Lauderdale–Hollywood International", "Fort Lauderdale", "United States", "US"],
  ["TPA", "Tampa International", "Tampa", "United States", "US"],
  ["CLT", "Charlotte Douglas International", "Charlotte", "United States", "US"],
  ["PHL", "Philadelphia International", "Philadelphia", "United States", "US"],
  ["DTW", "Detroit Metropolitan", "Detroit", "United States", "US"],
  ["ORD", "O'Hare International", "Chicago", "United States", "US"],
  ["MDW", "Midway International", "Chicago", "United States", "US"],
  ["MSP", "Minneapolis–Saint Paul International", "Minneapolis", "United States", "US"],
  ["DEN", "Denver International", "Denver", "United States", "US"],
  ["DFW", "Dallas/Fort Worth International", "Dallas", "United States", "US"],
  ["IAH", "George Bush Intercontinental", "Houston", "United States", "US"],
  ["AUS", "Austin–Bergstrom International", "Austin", "United States", "US"],
  ["PHX", "Phoenix Sky Harbor International", "Phoenix", "United States", "US"],
  ["LAS", "Harry Reid International", "Las Vegas", "United States", "US"],
  ["SLC", "Salt Lake City International", "Salt Lake City", "United States", "US"],
  ["LAX", "Los Angeles International", "Los Angeles", "United States", "US"],
  ["SAN", "San Diego International", "San Diego", "United States", "US"],
  ["SFO", "San Francisco International", "San Francisco", "United States", "US"],
  ["SJC", "Norman Y. Mineta San José International", "San Jose", "United States", "US"],
  ["OAK", "Oakland International", "Oakland", "United States", "US"],
  ["SEA", "Seattle–Tacoma International", "Seattle", "United States", "US"],
  ["PDX", "Portland International", "Portland", "United States", "US"],
  ["HNL", "Daniel K. Inouye International", "Honolulu", "United States", "US"],
  ["YYZ", "Toronto Pearson International", "Toronto", "Canada", "CA"],
  ["YUL", "Montréal–Trudeau International", "Montréal", "Canada", "CA"],
  ["YVR", "Vancouver International", "Vancouver", "Canada", "CA"],
  ["YYC", "Calgary International", "Calgary", "Canada", "CA"],
  ["YEG", "Edmonton International", "Edmonton", "Canada", "CA"],
  ["YOW", "Ottawa Macdonald–Cartier International", "Ottawa", "Canada", "CA"],
  ["MEX", "Mexico City International", "Mexico City", "Mexico", "MX"],
  ["CUN", "Cancún International", "Cancún", "Mexico", "MX"],
  ["GDL", "Guadalajara International", "Guadalajara", "Mexico", "MX"],
  // Latin America
  ["GRU", "São Paulo–Guarulhos International", "São Paulo", "Brazil", "BR"],
  ["GIG", "Rio de Janeiro–Galeão International", "Rio de Janeiro", "Brazil", "BR"],
  ["BSB", "Brasília International", "Brasília", "Brazil", "BR"],
  ["EZE", "Ministro Pistarini International", "Buenos Aires", "Argentina", "AR"],
  ["SCL", "Arturo Merino Benítez International", "Santiago", "Chile", "CL"],
  ["LIM", "Jorge Chávez International", "Lima", "Peru", "PE"],
  ["BOG", "El Dorado International", "Bogotá", "Colombia", "CO"],
  ["UIO", "Mariscal Sucre International", "Quito", "Ecuador", "EC"],
  ["CCS", "Simón Bolívar International", "Caracas", "Venezuela", "VE"],
  ["PTY", "Tocumen International", "Panama City", "Panama", "PA"],
  ["SJO", "Juan Santamaría International", "San José", "Costa Rica", "CR"],
  ["HAV", "José Martí International", "Havana", "Cuba", "CU"],
  ["SDQ", "Las Américas International", "Santo Domingo", "Dominican Republic", "DO"],
  ["KIN", "Norman Manley International", "Kingston", "Jamaica", "JM"],
  // Asia
  ["DEL", "Indira Gandhi International", "New Delhi", "India", "IN"],
  ["BOM", "Chhatrapati Shivaji Maharaj International", "Mumbai", "India", "IN"],
  ["BLR", "Kempegowda International", "Bangalore", "India", "IN"],
  ["MAA", "Chennai International", "Chennai", "India", "IN"],
  ["HYD", "Rajiv Gandhi International", "Hyderabad", "India", "IN"],
  ["CCU", "Netaji Subhas Chandra Bose International", "Kolkata", "India", "IN"],
  ["GOI", "Goa International", "Goa", "India", "IN"],
  ["COK", "Cochin International", "Kochi", "India", "IN"],
  ["KHI", "Jinnah International", "Karachi", "Pakistan", "PK"],
  ["LHE", "Allama Iqbal International", "Lahore", "Pakistan", "PK"],
  ["ISB", "Islamabad International", "Islamabad", "Pakistan", "PK"],
  ["DAC", "Hazrat Shahjalal International", "Dhaka", "Bangladesh", "BD"],
  ["CMB", "Bandaranaike International", "Colombo", "Sri Lanka", "LK"],
  ["KTM", "Tribhuvan International", "Kathmandu", "Nepal", "NP"],
  ["MLE", "Velana International", "Malé", "Maldives", "MV"],
  ["BKK", "Suvarnabhumi", "Bangkok", "Thailand", "TH"],
  ["DMK", "Don Mueang International", "Bangkok", "Thailand", "TH"],
  ["HKT", "Phuket International", "Phuket", "Thailand", "TH"],
  ["CNX", "Chiang Mai International", "Chiang Mai", "Thailand", "TH"],
  ["SIN", "Singapore Changi", "Singapore", "Singapore", "SG"],
  ["KUL", "Kuala Lumpur International", "Kuala Lumpur", "Malaysia", "MY"],
  ["PEN", "Penang International", "Penang", "Malaysia", "MY"],
  ["CGK", "Soekarno–Hatta International", "Jakarta", "Indonesia", "ID"],
  ["DPS", "Ngurah Rai International", "Denpasar", "Indonesia", "ID"],
  ["MNL", "Ninoy Aquino International", "Manila", "Philippines", "PH"],
  ["CEB", "Mactan–Cebu International", "Cebu", "Philippines", "PH"],
  ["SGN", "Tan Son Nhat International", "Ho Chi Minh City", "Vietnam", "VN"],
  ["HAN", "Noi Bai International", "Hanoi", "Vietnam", "VN"],
  ["PNH", "Phnom Penh International", "Phnom Penh", "Cambodia", "KH"],
  ["RGN", "Yangon International", "Yangon", "Myanmar", "MM"],
  ["HKG", "Hong Kong International", "Hong Kong", "Hong Kong", "HK"],
  ["MFM", "Macau International", "Macau", "Macau", "MO"],
  ["TPE", "Taiwan Taoyuan International", "Taipei", "Taiwan", "TW"],
  ["PEK", "Beijing Capital International", "Beijing", "China", "CN"],
  ["PKX", "Beijing Daxing International", "Beijing", "China", "CN"],
  ["PVG", "Shanghai Pudong International", "Shanghai", "China", "CN"],
  ["SHA", "Shanghai Hongqiao International", "Shanghai", "China", "CN"],
  ["CAN", "Guangzhou Baiyun International", "Guangzhou", "China", "CN"],
  ["SZX", "Shenzhen Bao'an International", "Shenzhen", "China", "CN"],
  ["CTU", "Chengdu Shuangliu International", "Chengdu", "China", "CN"],
  ["XIY", "Xi'an Xianyang International", "Xi'an", "China", "CN"],
  ["NRT", "Narita International", "Tokyo", "Japan", "JP"],
  ["HND", "Tokyo Haneda", "Tokyo", "Japan", "JP"],
  ["KIX", "Kansai International", "Osaka", "Japan", "JP"],
  ["ITM", "Osaka International (Itami)", "Osaka", "Japan", "JP"],
  ["NGO", "Chubu Centrair International", "Nagoya", "Japan", "JP"],
  ["FUK", "Fukuoka Airport", "Fukuoka", "Japan", "JP"],
  ["ICN", "Incheon International", "Seoul", "South Korea", "KR"],
  ["GMP", "Gimpo International", "Seoul", "South Korea", "KR"],
  ["PUS", "Gimhae International", "Busan", "South Korea", "KR"],
  ["ULN", "Chinggis Khaan International", "Ulaanbaatar", "Mongolia", "MN"],
  ["TAS", "Tashkent International", "Tashkent", "Uzbekistan", "UZ"],
  ["ALA", "Almaty International", "Almaty", "Kazakhstan", "KZ"],
  ["BAK", "Heydar Aliyev International", "Baku", "Azerbaijan", "AZ"],
  ["TBS", "Tbilisi International", "Tbilisi", "Georgia", "GE"],
  ["EVN", "Zvartnots International", "Yerevan", "Armenia", "AM"],
  // Oceania
  ["SYD", "Sydney Kingsford Smith", "Sydney", "Australia", "AU"],
  ["MEL", "Melbourne Tullamarine", "Melbourne", "Australia", "AU"],
  ["BNE", "Brisbane Airport", "Brisbane", "Australia", "AU"],
  ["PER", "Perth Airport", "Perth", "Australia", "AU"],
  ["ADL", "Adelaide Airport", "Adelaide", "Australia", "AU"],
  ["OOL", "Gold Coast Airport", "Gold Coast", "Australia", "AU"],
  ["CNS", "Cairns Airport", "Cairns", "Australia", "AU"],
  ["AKL", "Auckland Airport", "Auckland", "New Zealand", "NZ"],
  ["WLG", "Wellington International", "Wellington", "New Zealand", "NZ"],
  ["CHC", "Christchurch International", "Christchurch", "New Zealand", "NZ"],
  ["NAN", "Nadi International", "Nadi", "Fiji", "FJ"],
  ["PPT", "Faaʻa International", "Papeete", "French Polynesia", "PF"],
];

export const AIRPORTS: Airport[] = RAW.map(([code, name, city, country, cc]) => ({ code, name, city, country, cc }));

const NORM_CACHE = new Map<string, string>();
function normalize(s: string): string {
  const cached = NORM_CACHE.get(s);
  if (cached) return cached;
  const out = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  NORM_CACHE.set(s, out);
  return out;
}

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const exact: Airport[] = [];
  const starts: Airport[] = [];
  const contains: Airport[] = [];
  for (const a of AIRPORTS) {
    if (a.code.toLowerCase() === q) { exact.push(a); continue; }
    const code = a.code.toLowerCase();
    const city = normalize(a.city);
    const name = normalize(a.name);
    const country = normalize(a.country);
    if (code.startsWith(q) || city.startsWith(q) || country.startsWith(q)) starts.push(a);
    else if (city.includes(q) || name.includes(q) || country.includes(q)) contains.push(a);
    if (exact.length + starts.length + contains.length > limit * 3) break;
  }
  return [...exact, ...starts, ...contains].slice(0, limit);
}

export function findAirport(code: string): Airport | undefined {
  const c = code.trim().toUpperCase();
  return AIRPORTS.find((a) => a.code === c);
}
