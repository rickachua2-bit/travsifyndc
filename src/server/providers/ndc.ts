// xml.agency / SiteCity flights supplier — SOAP 1.2 over HTTP.
// Docs: xml.agency Flight API v3.17.
//
// Full auto-ticketing pipeline:
//   - ndcSearch()    → AeroSearch    (normalized offers + opaque _ndc_context)
//   - ndcPrebook()   → AeroPrebook   (price lock just before debiting wallet)
//   - ndcBook()      → AeroBook      (reservation with passenger data → returns BookId/BookGuid/PNR)
//   - ndcConfirm()   → ConfirmBook   (issues tickets → returns ticket numbers)
//   - ndcAnnulate()  → AnnulateBook  (VOID — used to refund on confirm failure)

import { fetchWithTimeout, TIMEOUTS } from "./fetch-with-timeout";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function cfg() {
  return {
    enabled: (process.env.NDC_SITECITY_ENABLED || "false").toLowerCase() === "true",
    searchUrl: process.env.NDC_API_SEARCH_URL || "",
    actionUrl: process.env.NDC_API_ACTION_URL || process.env.NDC_API_SEARCH_URL || "",
    token: process.env.NDC_API_TOKEN || "00000000-0000-0000-0000-000000000000",
    login: process.env.NDC_API_LOGIN || "test",
    pass: process.env.NDC_API_PASS || "test",
    deviceId: process.env.NDC_API_DEVICE_ID || "Travsify",
  };
}

export function isNdcEnabled(): boolean {
  const c = cfg();
  return c.enabled && !!c.searchUrl;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NdcSearchInput = {
  origin: string;
  destination: string;
  departure_date: string; // YYYY-MM-DD
  return_date?: string;   // YYYY-MM-DD
  adults: number;
  children?: number;
  infants?: number;
  cabin?: "economy" | "premium_economy" | "business" | "first";
};

type NdcOfferContext = {
  // Internal — needed to call AeroPrebook later. Kept opaque to partners but
  // round-tripped via the offer payload so booking can re-use it.
  offer_code: string;
  search_guid?: string;
  currency: string;
};

// ---------------------------------------------------------------------------
// SOAP helpers
// ---------------------------------------------------------------------------

const NS_COMMON = "http://schemas.datacontract.org/2004/07/SiteCity.Common";
const NS_SEARCH = "http://schemas.datacontract.org/2004/07/SiteCity.Avia.Search";
const NS_PREBOOK = "http://schemas.datacontract.org/2004/07/SiteCity.Avia.Prebook";
const NS_BOOKING = "http://schemas.datacontract.org/2004/07/SiteCity.Avia.Booking";
const NS_CONFIRM = "http://schemas.datacontract.org/2004/07/SiteCity.BookInfo.ConfirmBook";
const NS_ANNULATE = "http://schemas.datacontract.org/2004/07/SiteCity.BookInfo.AnnulateBook";

function xmlEscape(s: string | undefined | null): string {
  return String(s ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)
  );
}

function credentialsXml(currency: string, language = "EN") {
  const c = cfg();
  return `<a:ApiLogin>${xmlEscape(c.login)}</a:ApiLogin>`
    + `<a:ApiPassword>${xmlEscape(c.pass)}</a:ApiPassword>`
    + `<a:AuthExtendedData i:nil="true"/>`
    + `<a:Currency>${xmlEscape(currency)}</a:Currency>`
    + `<a:DeviceId>${xmlEscape(c.deviceId)}</a:DeviceId>`
    + `<a:Language>${xmlEscape(language)}</a:Language>`
    + `<a:TokenGuid>${xmlEscape(c.token)}</a:TokenGuid>`;
}

/** Convert YYYY-MM-DD → DD.MM.YYYY (xml.agency format). */
function toSiteCityDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

const CABIN_MAP: Record<NonNullable<NdcSearchInput["cabin"]>, string> = {
  economy: "Econom",
  premium_economy: "PremiumEconomy",
  business: "Business",
  first: "First",
};

async function soapCall(opts: {
  url: string;
  action: string;
  body: string;
  timeoutMs: number;
}): Promise<string> {
  const res = await fetchWithTimeout(opts.url, {
    method: "POST",
    headers: {
      "Content-Type": `application/soap+xml; charset=utf-8; action="${opts.action}"`,
      "Accept-Encoding": "gzip, deflate",
    },
    body: opts.body,
  }, { providerName: "xml.agency", timeoutMs: opts.timeoutMs });
  const text = await res.text();
  if (!res.ok) {
    // SOAP faults come back as 500 with an envelope; surface the Reason text.
    const reason = pick(text, /<(?:s:)?Text[^>]*>([^<]+)<\/(?:s:)?Text>/i)
      || pick(text, /<Description>([^<]+)<\/Description>/i)
      || `HTTP ${res.status}`;
    throw new Error(`xml.agency SOAP fault: ${reason}`);
  }
  // Even 200s can be ErrorCode>=1000 logical failures — let parsers handle it.
  return text;
}

// ---------------------------------------------------------------------------
// Tiny tag-pluck XML parser. The full SOAP response is huge but we only need
// a handful of fields. We deliberately avoid pulling a full XML lib (Worker
// runtime constraints + bundle size). All parsers are tolerant of namespace
// prefixes (a:, b:, etc.) by using \w*:? in the regex.
// ---------------------------------------------------------------------------

function pick(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? m[1] : null;
}
function pickAll(s: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = r.exec(s)) !== null) out.push(m[1]);
  return out;
}
function tag(name: string): RegExp {
  // matches <prefix?:name ...>...</prefix?:name>
  return new RegExp(`<\\w*:?${name}[^>]*>([\\s\\S]*?)<\\/\\w*:?${name}>`, "i");
}
function tagAll(name: string): RegExp {
  return new RegExp(`<\\w*:?${name}[^>]*>([\\s\\S]*?)<\\/\\w*:?${name}>`, "gi");
}

// Parse "DD.MM.YYYY HH:MM" → ISO 8601
function parseSiteCityDateTime(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yy, hh = "00", mi = "00"] = m;
  return `${yy}-${mm}-${dd}T${hh}:${mi}:00`;
}

// ---------------------------------------------------------------------------
// AeroSearch
// ---------------------------------------------------------------------------

export async function ndcSearch(input: NdcSearchInput) {
  if (!isNdcEnabled()) {
    return { offers: [] as Array<Record<string, unknown>>, note: "xml.agency disabled" };
  }
  const c = cfg();
  const currency = "USD"; // priced in USD, FX-converted downstream

  const slices: Array<{ origin: string; destination: string; date: string }> = [
    { origin: input.origin, destination: input.destination, date: input.departure_date },
  ];
  if (input.return_date) {
    slices.push({ origin: input.destination, destination: input.origin, date: input.return_date });
  }

  const flightsXml = slices.map((s) =>
    `<a:SearchFlight>`
    + `<a:Date>${toSiteCityDate(s.date)}</a:Date>`
    + `<a:IATAFrom>${xmlEscape(s.origin.toUpperCase())}</a:IATAFrom>`
    + `<a:IATATo>${xmlEscape(s.destination.toUpperCase())}</a:IATATo>`
    + `</a:SearchFlight>`
  ).join("");

  const body = `<?xml version="1.0" encoding="utf-8"?>`
    + `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">`
    + `<s:Body>`
    + `<AeroSearch xmlns="http://tempuri.org/">`
    + `<credentials xmlns:a="${NS_COMMON}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + credentialsXml(currency)
    + `</credentials>`
    + `<aeroSearchParams xmlns:a="${NS_SEARCH}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + `<a:Adults>${input.adults | 0}</a:Adults>`
    + `<a:Childs>${(input.children || 0) | 0}</a:Childs>`
    + `<a:ExtendedParams i:nil="true"/>`
    + `<a:FlightClass>${CABIN_MAP[input.cabin || "economy"]}</a:FlightClass>`
    + `<a:Infants>${(input.infants || 0) | 0}</a:Infants>`
    + `<a:PartnerName i:nil="true"/>`
    + `<a:SearchFlights>${flightsXml}</a:SearchFlights>`
    + `</aeroSearchParams>`
    + `</AeroSearch>`
    + `</s:Body></s:Envelope>`;

  const xml = await soapCall({
    url: c.searchUrl,
    action: "http://tempuri.org/ISiteAvia/AeroSearch",
    body,
    timeoutMs: TIMEOUTS.search,
  });

  // Logical error envelope (Success=false)
  const success = pick(xml, tag("Success"));
  if (success && success.trim().toLowerCase() === "false") {
    const code = pick(xml, tag("ErrorCode"));
    const msg = pick(xml, tag("ErrorString"));
    if (code && Number(code) >= 1000 && msg) {
      throw new Error(`xml.agency: ${msg}`);
    }
    return { offers: [] };
  }

  const responseCurrency = pick(xml, tag("Currency")) || currency;
  const searchGuid = pick(xml, tag("SearchGuid")) || undefined;

  // Build airport lookup: Iata → { city, name }
  const airportBlocks = pickAll(xml, tagAll("AirPortInfo"));
  const airports = new Map<string, { city: string; name: string }>();
  for (const block of airportBlocks) {
    const iata = pick(block, tag("Iata"));
    if (!iata) continue;
    airports.set(iata, {
      city: pick(block, tag("City")) || "",
      name: pick(block, tag("Name")) || "",
    });
  }
  // Airline lookup: Code → name
  const airlineBlocks = pickAll(xml, tagAll("CodeValue"));
  const airlines = new Map<string, string>();
  for (const block of airlineBlocks) {
    const code = pick(block, tag("Code"));
    const name = pick(block, tag("Value"));
    if (code) airlines.set(code, name || code);
  }

  // Each FlightData element is one offer (with one or more OfferInfo
  // describing per-leg combinations). We flatten to a single normalized offer
  // per FlightData using its TotalPrice + first OfferInfo segments.
  const flightDataBlocks = pickAll(xml, tagAll("FlightData"))
    // Skip outer FlightData wrapper which contains nested FlightData children
    .filter((b) => b.includes("<a:OfferCode") || b.includes(":OfferCode"));

  const offers: Array<Record<string, unknown>> = [];
  for (const fd of flightDataBlocks) {
    const offerCode = pick(fd, tag("OfferCode"));
    const totalPriceStr = pick(fd, tag("TotalPrice"));
    if (!offerCode || !totalPriceStr) continue;
    const totalPrice = Number(totalPriceStr);
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) continue;

    // Use first OfferInfo for slice/segment shape
    const offerInfoBlocks = pickAll(fd, tagAll("OfferInfo"));
    const slicesOut: Array<Record<string, unknown>> = [];
    const validatingAirline = pick(fd, tag("ValidatingAirline")) || undefined;

    for (const oi of offerInfoBlocks) {
      const segs = pickAll(oi, tagAll("OfferSegment"));
      const segments = segs.map((seg) => {
        const dep = pick(seg, tag("Departure")) || "";
        const arr = pick(seg, tag("Arrival")) || "";
        const depIata = pick(dep, tag("Iata")) || "";
        const arrIata = pick(arr, tag("Iata")) || "";
        const marketingCode = pick(seg, tag("MarketingAirline")) || "";
        return {
          departing_at: parseSiteCityDateTime(pick(dep, tag("Date"))),
          arriving_at: parseSiteCityDateTime(pick(arr, tag("Date"))),
          origin: depIata,
          destination: arrIata,
          origin_city: airports.get(depIata)?.city || undefined,
          destination_city: airports.get(arrIata)?.city || undefined,
          marketing_carrier: marketingCode,
          marketing_carrier_name: airlines.get(marketingCode) || undefined,
          flight_number: pick(seg, tag("FlightNum")) || undefined,
          aircraft: pick(seg, tag("AirCraft"))?.trim() || undefined,
          duration_minutes: Number(pick(seg, tag("FlightMinutes")) || 0) || undefined,
          cabin: pick(seg, tag("FlightClass")) || undefined,
        };
      });
      if (segments.length > 0) {
        slicesOut.push({
          origin: segments[0].origin,
          destination: segments[segments.length - 1].destination,
          segments,
        });
      }
    }

    const ctx: NdcOfferContext = {
      offer_code: offerCode,
      search_guid: searchGuid,
      currency: responseCurrency,
    };

    offers.push({
      id: `xmlagency_${Buffer.from(offerCode).toString("base64").slice(0, 32)}`,
      total_amount: totalPrice.toFixed(2),
      total_currency: responseCurrency,
      owner: validatingAirline ? (airlines.get(validatingAirline) || validatingAirline) : undefined,
      slices: slicesOut,
      // Internal context — not exposed to partners; stripped in the public
      // search payload before returning to the partner. Used by orders flow.
      _ndc_context: ctx,
    });
  }

  return { offers, search_guid: searchGuid };
}

// ---------------------------------------------------------------------------
// AeroPrebook — price lock + book limit check before charging the wallet
// ---------------------------------------------------------------------------

export async function ndcPrebook(ctx: NdcOfferContext) {
  if (!isNdcEnabled()) throw new Error("xml.agency disabled");
  const c = cfg();
  const body = `<?xml version="1.0" encoding="utf-8"?>`
    + `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">`
    + `<s:Body>`
    + `<AeroPrebook xmlns="http://tempuri.org/">`
    + `<credentials xmlns:a="${NS_COMMON}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + credentialsXml(ctx.currency)
    + `</credentials>`
    + `<aeroPrebookParams xmlns:a="${NS_PREBOOK}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + `<a:OfferCode>${xmlEscape(ctx.offer_code)}</a:OfferCode>`
    + (ctx.search_guid ? `<a:SearchGuid>${xmlEscape(ctx.search_guid)}</a:SearchGuid>` : `<a:SearchGuid i:nil="true"/>`)
    + `</aeroPrebookParams>`
    + `</AeroPrebook>`
    + `</s:Body></s:Envelope>`;

  const xml = await soapCall({
    url: c.actionUrl,
    action: "http://tempuri.org/ISiteAvia/AeroPrebook",
    body,
    timeoutMs: TIMEOUTS.search,
  });

  const success = pick(xml, tag("Success"));
  if (success && success.trim().toLowerCase() === "false") {
    const msg = pick(xml, tag("ErrorString")) || "Prebook failed";
    throw new Error(`xml.agency prebook: ${msg}`);
  }
  const fullPrice = Number(pick(xml, tag("FullPrice")) || "0");
  const currency = pick(xml, tag("Currency")) || ctx.currency;
  return { full_price: fullPrice, currency };
}

export type { NdcOfferContext };

// ---------------------------------------------------------------------------
// AeroBook — reservation with passenger data
// ---------------------------------------------------------------------------

export type NdcPassenger = {
  given_name: string;
  family_name: string;
  middle_name?: string;
  born_on: string;        // YYYY-MM-DD
  gender: "m" | "f";
  age_type: "Adult" | "Child" | "Infant";
  document_number: string;
  document_expiry?: string; // YYYY-MM-DD
  nationality_iso3?: string;
};

export type NdcBookInput = {
  ctx: NdcOfferContext;
  client_reference: string;     // ≤40 chars
  email: string;
  phone: string;
  passengers: NdcPassenger[];
  selected_tariffs?: string[];
  selected_services?: string[];
};

export type NdcBookResult = {
  book_id: string;
  book_guid: string;
  full_price: number;
  currency: string;
  confirmable_to?: string;
  pnrs: string[];
};

export async function ndcBook(input: NdcBookInput): Promise<NdcBookResult> {
  if (!isNdcEnabled()) throw new Error("xml.agency disabled");
  const c = cfg();

  const paxXml = input.passengers.map((p) =>
    `<b:PaxData>`
    + `<b:AgeType>${p.age_type}</b:AgeType>`
    + `<b:BirthDay>${toSiteCityDate(p.born_on)}</b:BirthDay>`
    + (p.nationality_iso3 ? `<b:BirthISO>${xmlEscape(p.nationality_iso3)}</b:BirthISO>` : `<b:BirthISO i:nil="true"/>`)
    + `<b:Document>${xmlEscape(p.document_number)}</b:Document>`
    + (p.document_expiry ? `<b:DocumentExDate>${toSiteCityDate(p.document_expiry)}</b:DocumentExDate>` : "")
    + `<b:GenderType>${p.gender === "f" ? "Female" : "Male"}</b:GenderType>`
    + (p.middle_name ? `<b:MiddleName>${xmlEscape(p.middle_name)}</b:MiddleName>` : `<b:MiddleName i:nil="true"/>`)
    + `<b:Name>${xmlEscape(p.given_name)}</b:Name>`
    + `<b:Surname>${xmlEscape(p.family_name)}</b:Surname>`
    + `</b:PaxData>`
  ).join("");

  const tariffsXml = input.selected_tariffs && input.selected_tariffs.length
    ? `<a:SelectedTariffs xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays">`
      + input.selected_tariffs.map((id) => `<b:string>${xmlEscape(id)}</b:string>`).join("")
      + `</a:SelectedTariffs>`
    : `<a:SelectedTariffs i:nil="true" xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays"/>`;

  const servicesXml = input.selected_services && input.selected_services.length
    ? `<a:SelectedServices xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays">`
      + input.selected_services.map((id) => `<b:string>${xmlEscape(id)}</b:string>`).join("")
      + `</a:SelectedServices>`
    : `<a:SelectedServices i:nil="true" xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays"/>`;

  const body = `<?xml version="1.0" encoding="utf-8"?>`
    + `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">`
    + `<s:Body>`
    + `<AeroBook xmlns="http://tempuri.org/">`
    + `<credentials xmlns:a="${NS_COMMON}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + credentialsXml(input.ctx.currency)
    + `</credentials>`
    + `<aeroBookParams xmlns:a="${NS_BOOKING}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + `<a:ClientReference>${xmlEscape(input.client_reference.slice(0, 40))}</a:ClientReference>`
    + `<a:CustomerFIO i:nil="true"/>`
    + `<a:Email>${xmlEscape(input.email)}</a:Email>`
    + `<a:ExtendedParams i:nil="true"/>`
    + `<a:Marker i:nil="true"/>`
    + `<a:OfferCode>${xmlEscape(input.ctx.offer_code)}</a:OfferCode>`
    + `<a:Partner i:nil="true"/>`
    + `<a:PaxList xmlns:b="${NS_COMMON}">${paxXml}</a:PaxList>`
    + `<a:Phone>${xmlEscape(input.phone)}</a:Phone>`
    + (input.ctx.search_guid ? `<a:SearchGuid>${xmlEscape(input.ctx.search_guid)}</a:SearchGuid>` : `<a:SearchGuid i:nil="true"/>`)
    + servicesXml
    + tariffsXml
    + `<a:Utm i:nil="true"/>`
    + `</aeroBookParams>`
    + `</AeroBook>`
    + `</s:Body></s:Envelope>`;

  const xml = await soapCall({
    url: c.actionUrl,
    action: "http://tempuri.org/ISiteAvia/AeroBook",
    body,
    timeoutMs: TIMEOUTS.search,
  });

  const success = pick(xml, tag("Success"));
  if (success && success.trim().toLowerCase() === "false") {
    const msg = pick(xml, tag("ErrorString")) || "Book failed";
    throw new Error(`xml.agency book: ${msg}`);
  }
  const bookId = pick(xml, tag("BookId"));
  const bookGuid = pick(xml, tag("BookGuid"));
  if (!bookId || !bookGuid) throw new Error("xml.agency book: missing BookId/BookGuid");
  const fullPrice = Number(pick(xml, tag("FullPrice")) || "0");
  const currency = pick(xml, tag("Currency")) || input.ctx.currency;
  const confirmableTo = pick(xml, tag("ConfirmableTo")) || undefined;
  const pnrs = pickAll(xml, tagAll("PNR"));

  return { book_id: bookId, book_guid: bookGuid, full_price: fullPrice, currency, confirmable_to: confirmableTo, pnrs };
}

// ---------------------------------------------------------------------------
// ConfirmBook — issues tickets
// ---------------------------------------------------------------------------

export type NdcConfirmResult = {
  status: "Booked" | "WaitToBooking" | "Cancelled" | string;
  pnrs: string[];
  ticket_numbers: string[];
  cancellable: boolean;
  deadline_utc?: string;
};

export async function ndcConfirm(input: { book_id: string; book_guid: string; price: number; currency: string }): Promise<NdcConfirmResult> {
  if (!isNdcEnabled()) throw new Error("xml.agency disabled");
  const c = cfg();

  const body = `<?xml version="1.0" encoding="utf-8"?>`
    + `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">`
    + `<s:Body>`
    + `<ConfirmBook xmlns="http://tempuri.org/">`
    + `<authInfo xmlns:a="${NS_COMMON}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + credentialsXml(input.currency)
    + `</authInfo>`
    + `<confirmParams xmlns:a="${NS_CONFIRM}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + `<a:BookGuid>${xmlEscape(input.book_guid)}</a:BookGuid>`
    + `<a:BookId>${xmlEscape(input.book_id)}</a:BookId>`
    + `<a:Price>${input.price.toFixed(2)}</a:Price>`
    + `</confirmParams>`
    + `</ConfirmBook>`
    + `</s:Body></s:Envelope>`;

  const xml = await soapCall({
    url: c.actionUrl,
    action: "http://tempuri.org/ISiteBookInfo/ConfirmBook",
    body,
    timeoutMs: TIMEOUTS.search,
  });

  const success = pick(xml, tag("Success"));
  if (success && success.trim().toLowerCase() === "false") {
    const msg = pick(xml, tag("ErrorString")) || "Confirm failed";
    throw new Error(`xml.agency confirm: ${msg}`);
  }
  const status = pick(xml, tag("BookingStatus")) || "Unknown";
  const pnrs = pickAll(xml, tagAll("PNR"));
  const tickets = pickAll(xml, tagAll("TicketNumber"));
  const cancellable = (pick(xml, tag("Cancellable")) || "").toLowerCase() === "true";
  const deadline = pick(xml, tag("DeadLineDateUtc")) || undefined;

  return { status, pnrs, ticket_numbers: tickets, cancellable, deadline_utc: deadline };
}

// ---------------------------------------------------------------------------
// AnnulateBook — VOID (compensation on confirm failure)
// ---------------------------------------------------------------------------

export async function ndcAnnulate(input: { book_id: string; book_guid: string; currency?: string }) {
  if (!isNdcEnabled()) return { success: false };
  const c = cfg();

  const body = `<?xml version="1.0" encoding="utf-8"?>`
    + `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">`
    + `<s:Body>`
    + `<AnnulateBook xmlns="http://tempuri.org/">`
    + `<credentials xmlns:a="${NS_COMMON}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + credentialsXml(input.currency || "USD")
    + `</credentials>`
    + `<annulateBookParams xmlns:a="${NS_ANNULATE}" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">`
    + `<a:BookGuid>${xmlEscape(input.book_guid)}</a:BookGuid>`
    + `<a:BookId>${xmlEscape(input.book_id)}</a:BookId>`
    + `</annulateBookParams>`
    + `</AnnulateBook>`
    + `</s:Body></s:Envelope>`;

  try {
    const xml = await soapCall({
      url: c.actionUrl,
      action: "http://tempuri.org/ISiteBookInfo/AnnulateBook",
      body,
      timeoutMs: TIMEOUTS.search,
    });
    const success = pick(xml, tag("Success"));
    return { success: success?.trim().toLowerCase() === "true" };
  } catch (e) {
    console.error("[ndc] annulate failed", e);
    return { success: false };
  }
}
