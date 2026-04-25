import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Rocket, KeyRound, Wallet as WalletIcon, Plane, Building2, MapPin, Car, Globe2, Shield,
  Webhook, AlertTriangle, CheckCircle2, Copy, ArrowRight, Search, Hash, Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/landing/PageShell";
import { toast } from "sonner";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
  head: () => ({
    meta: [
      { title: "Docs — Travsify NDC API" },
      { name: "description", content: "Full Travsify documentation: quickstart, authentication, flights, hotels, tours, transfers, e-Visas, insurance, webhooks, errors and going live." },
      { property: "og:title", content: "Travsify Docs — One API for the entire travel stack" },
      { property: "og:description", content: "Beginner-friendly guides, complete endpoint reference, copy-paste examples and a four-step path to production." },
    ],
  }),
});

type Section = {
  id: string;
  label: string;
  icon: typeof BookOpen;
  group: "Start here" | "Build" | "Verticals" | "Operate";
};

const SECTIONS: Section[] = [
  { id: "intro", label: "Introduction", icon: BookOpen, group: "Start here" },
  { id: "one-liner", label: "The one-liner", icon: Sparkles, group: "Start here" },
  { id: "quickstart", label: "5-minute quickstart", icon: Rocket, group: "Start here" },
  { id: "authentication", label: "Authentication", icon: KeyRound, group: "Start here" },
  { id: "wallet", label: "Wallet & funding", icon: WalletIcon, group: "Build" },
  { id: "markups", label: "Markups & pricing", icon: Sparkles, group: "Build" },
  { id: "flights", label: "Flights", icon: Plane, group: "Verticals" },
  { id: "hotels", label: "Hotels", icon: Building2, group: "Verticals" },
  { id: "tours", label: "Tours & activities", icon: MapPin, group: "Verticals" },
  { id: "transfers", label: "Transfers", icon: Car, group: "Verticals" },
  { id: "visas", label: "e-Visas", icon: Globe2, group: "Verticals" },
  { id: "insurance", label: "Insurance", icon: Shield, group: "Verticals" },
  { id: "webhooks", label: "Webhooks", icon: Webhook, group: "Operate" },
  { id: "errors", label: "Errors & retries", icon: AlertTriangle, group: "Operate" },
  { id: "going-live", label: "Going live", icon: CheckCircle2, group: "Operate" },
];

function DocsPage() {
  const [active, setActive] = useState("intro");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(q) || s.id.includes(q));
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Section[]>();
    filtered.forEach((s) => {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group)!.push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <PageShell>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[260px_1fr_220px]">
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Travsify Docs</div>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-primary">Build with confidence</h1>
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the docs"
              className="w-full rounded-md border border-border bg-white py-2 pl-8 pr-2 text-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <nav className="space-y-5 text-sm">
            {grouped.map(([group, items]) => (
              <div key={group}>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{group}</div>
                <ul className="space-y-0.5">
                  {items.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition ${
                          active === s.id ? "bg-accent/10 font-semibold text-accent" : "text-foreground hover:bg-surface"
                        }`}
                      >
                        <s.icon className="h-3.5 w-3.5" />
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 space-y-16 pb-24">
          <Intro />
          <OneLiner />
          <Quickstart />
          <Authentication />
          <WalletDocs />
          <Markups />
          <Vertical id="flights" icon={Plane} title="Flights" desc="Live NDC + GDS inventory via Duffel. Real seat maps, real-time confirmation, instant tickets.">
            <EndpointBlock method="POST" path="/api/v1/flights/search" body={`{
  "origin": "LOS",
  "destination": "DXB",
  "departure_date": "2026-06-01",
  "return_date": "2026-06-12",
  "adults": 1
}`} response={`{
  "data": {
    "offers": [{
      "id": "off_0001",
      "owner": "Emirates",
      "total_amount": "812.40",
      "total_currency": "USD"
    }]
  }
}`} />
            <EndpointBlock method="POST" path="/api/v1/flights/orders" body={`{
  "offer_id": "off_0001",
  "passengers": [{
    "title": "mr",
    "given_name": "Ada",
    "family_name": "Lovelace",
    "born_on": "1992-04-12",
    "gender": "f",
    "email": "ada@example.com",
    "phone_number": "+2348012345678"
  }]
}`} response={`{
  "data": {
    "booking_id": "bkg_01H...",
    "reference": "TSF-FLT-9X2K",
    "status": "confirmed",
    "ticket_numbers": ["176-1234567890"]
  }
}`} />
          </Vertical>

          <Vertical id="hotels" icon={Building2} title="Hotels" desc="2M+ properties via LiteAPI — instant confirmation, daily price refresh, cancellation policies included.">
            <EndpointBlock method="POST" path="/api/v1/hotels/search" body={`{
  "country_code": "AE",
  "checkin": "2026-06-12",
  "checkout": "2026-06-15",
  "adults": 2,
  "currency": "USD"
}`} response={`{
  "data": {
    "hotels": [{
      "id": "lp_5512",
      "name": "Atlantis The Royal",
      "stars": 5,
      "price": 940,
      "currency": "USD",
      "offer_id": "ofr_..."
    }]
  }
}`} />
            <EndpointBlock method="POST" path="/api/v1/hotels/bookings" body={`{
  "offer_id": "ofr_...",
  "holder": { "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com" },
  "guests": [{ "firstName": "Ada", "lastName": "Lovelace" }]
}`} response={`{ "data": { "booking_id": "bkg_...", "reference": "TSF-HTL-...", "status": "confirmed" } }`} />
          </Vertical>

          <Vertical id="tours" icon={MapPin} title="Tours & activities" desc="GetYourGuide affiliate inventory. Same unified API — your customers stay on your brand.">
            <EndpointBlock method="POST" path="/api/v1/tours/search" body={`{ "destination": "Dubai", "date": "2026-06-13", "participants": 2 }`} response={`{ "data": { "tours": [{ "id": "gyg_...", "title": "Burj Khalifa fast-track", "price": 89, "currency": "USD" }] } }`} />
            <EndpointBlock method="POST" path="/api/v1/tours/bookings" body={`{ "tour_id": "gyg_...", "participants": [{ "firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com" }] }`} response={`{ "data": { "booking_id": "bkg_...", "status": "processing" } }`} />
          </Vertical>

          <Vertical id="transfers" icon={Car} title="Transfers" desc="Mozio worldwide ground transport — sedans, vans, shuttles. Affiliate, fully wrapped.">
            <EndpointBlock method="POST" path="/api/v1/transfers/search" body={`{ "pickup": "DXB Airport", "dropoff": "Atlantis The Royal", "datetime": "2026-06-12T18:30", "passengers": 2 }`} response={`{ "data": { "transfers": [{ "id": "moz_...", "vehicle": "Sedan", "price": 65, "currency": "USD" }] } }`} />
          </Vertical>

          <Vertical id="visas" icon={Globe2} title="e-Visas" desc="Sherpa-powered visa eligibility + e-Visa application via affiliate. We handle fulfilment.">
            <EndpointBlock method="POST" path="/api/v1/visas/search" body={`{ "nationality": "NG", "destination": "AE", "purpose": "tourism" }`} response={`{ "data": { "visas": [{ "id": "shp_...", "name": "UAE 30-day eVisa", "price": 75, "currency": "USD" }] } }`} />
          </Vertical>

          <Vertical id="insurance" icon={Shield} title="Insurance" desc="SafetyWing travel medical & trip insurance — quote and bind in one call.">
            <EndpointBlock method="POST" path="/api/v1/insurance/search" body={`{ "nationality": "NG", "destination": "AE", "start_date": "2026-06-12", "end_date": "2026-06-19", "travelers": 1 }`} response={`{ "data": { "plans": [{ "id": "sw_...", "name": "Nomad Insurance", "price": 42, "currency": "USD" }] } }`} />
          </Vertical>

          <Webhooks />
          <Errors />
          <GoingLive />
        </article>

        <aside className="hidden text-xs text-muted-foreground lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-foreground">On this page</div>
          <ul className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={`flex items-center gap-1.5 hover:text-foreground ${active === s.id ? "text-accent" : ""}`}>
                  <Hash className="h-3 w-3" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}

function H2({ id, icon: Icon, children }: { id: string; icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 flex items-center gap-3 font-display text-3xl font-extrabold text-primary">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-foreground/85">{children}</p>;
}

function Code({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="group relative">
      <button
        onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80 opacity-0 transition group-hover:opacity-100"
      >
        <Copy className="h-3 w-3" /> Copy
      </button>
      <div className="absolute left-3 top-2 text-[10px] font-mono uppercase tracking-wider text-white/40">{lang}</div>
      <pre className="overflow-x-auto rounded-xl bg-primary p-4 pt-7 font-mono text-xs leading-relaxed text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Callout({ tone = "info", title, children }: { tone?: "info" | "warn" | "success"; title: string; children: React.ReactNode }) {
  const map = {
    info: "border-accent/30 bg-accent/5 text-foreground",
    warn: "border-amber-500/30 bg-amber-500/5 text-foreground",
    success: "border-success/30 bg-success/5 text-foreground",
  } as const;
  return (
    <div className={`rounded-xl border p-4 text-sm ${map[tone]}`}>
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-foreground">{title}</div>
      {children}
    </div>
  );
}

function Intro() {
  return (
    <section className="space-y-4">
      <H2 id="intro" icon={BookOpen}>Introduction</H2>
      <P>
        <strong>Travsify is one REST API for the entire travel stack</strong> — flights, hotels, tours, transfers, e-Visas
        and insurance. You ship one integration; we keep 6 supplier connections live for you and pay your wallet
        the difference between supplier price and your selling price.
      </P>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat k="6" v="Travel verticals · one schema" />
        <Stat k="< 800ms" v="P95 search latency" />
        <Stat k="2" v="Currencies · USD & NGN wallet" />
      </div>
      <Callout title="Who this guide is for">
        Anyone building a travel product — even if you've never touched an airline API. We assume you know how to
        send an HTTP request. That's it.
      </Callout>
    </section>
  );
}

type LangTab = { id: string; label: string; code: string };

function OneLiner() {
  const KEY = "tsk_sandbox_your_key_here";
  const URL = "https://api.travsify.com/api/v1/flights/search";
  const PAYLOAD = `{"origin":"LOS","destination":"DXB","departure_date":"2026-06-01","adults":1}`;

  const tabs: LangTab[] = [
    { id: "curl", label: "cURL", code: `curl -X POST ${URL} -H "Authorization: Bearer ${KEY}" -H "Content-Type: application/json" -d '${PAYLOAD}'` },
    { id: "js", label: "JavaScript", code: `fetch("${URL}",{method:"POST",headers:{Authorization:"Bearer ${KEY}","Content-Type":"application/json"},body:'${PAYLOAD}'}).then(r=>r.json()).then(console.log)` },
    { id: "ts", label: "TypeScript", code: `const r = await fetch("${URL}",{method:"POST",headers:{Authorization:"Bearer ${KEY}","Content-Type":"application/json"},body:'${PAYLOAD}'}); console.log(await r.json());` },
    { id: "python", label: "Python", code: `import requests; print(requests.post("${URL}", headers={"Authorization":"Bearer ${KEY}"}, json=${PAYLOAD}).json())` },
    { id: "php", label: "PHP", code: `<?php echo file_get_contents("${URL}", false, stream_context_create(["http"=>["method"=>"POST","header"=>"Authorization: Bearer ${KEY}\\r\\nContent-Type: application/json","content"=>'${PAYLOAD}']]));` },
    { id: "ruby", label: "Ruby", code: `require 'net/http';require 'json'; puts Net::HTTP.post(URI("${URL}"), '${PAYLOAD}', {"Authorization"=>"Bearer ${KEY}","Content-Type"=>"application/json"}).body` },
    { id: "go", label: "Go", code: `r,_:=http.Post("${URL}","application/json",strings.NewReader(\`${PAYLOAD}\`)); r.Header.Set("Authorization","Bearer ${KEY}"); io.Copy(os.Stdout,r.Body)` },
    { id: "java", label: "Java", code: `HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("${URL}")).header("Authorization","Bearer ${KEY}").header("Content-Type","application/json").POST(BodyPublishers.ofString("${PAYLOAD}")).build(), BodyHandlers.ofString()).body();` },
    { id: "csharp", label: "C#", code: `await new HttpClient{DefaultRequestHeaders={{"Authorization","Bearer ${KEY}"}}}.PostAsync("${URL}", new StringContent("${PAYLOAD}", Encoding.UTF8, "application/json"));` },
    { id: "swift", label: "Swift", code: `var r=URLRequest(url:URL(string:"${URL}")!); r.httpMethod="POST"; r.setValue("Bearer ${KEY}",forHTTPHeaderField:"Authorization"); r.httpBody=#"${PAYLOAD}"#.data(using:.utf8); URLSession.shared.dataTask(with:r){d,_,_ in print(String(data:d!,encoding:.utf8)!)}.resume()` },
    { id: "kotlin", label: "Kotlin", code: `OkHttpClient().newCall(Request.Builder().url("${URL}").header("Authorization","Bearer ${KEY}").post("${PAYLOAD}".toRequestBody("application/json".toMediaType())).build()).execute().body?.string()` },
    { id: "rust", label: "Rust", code: `reqwest::Client::new().post("${URL}").bearer_auth("${KEY}").json(&serde_json::json!(${PAYLOAD})).send().await?.text().await?;` },
    { id: "html", label: "HTML <script>", code: `<script src="https://api.travsify.com/sdk.js"></script><script>Travsify.init("${KEY}").flights.search(${PAYLOAD}).then(console.log)</script>` },
  ];
  const [active, setActive] = useState("curl");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <section className="space-y-5">
      <H2 id="one-liner" icon={Sparkles}>The one-liner</H2>
      <P>
        <strong>One line of code. Any language. Live data.</strong> Travsify is a plain REST API — every language on
        Earth can speak HTTP, so the entire travel stack is one HTTP call away. Pick your stack, paste the line,
        swap in your key. That's the integration.
      </P>
      <div className="rounded-2xl border border-border bg-white p-2" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                active === t.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-surface"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-3">
          <Code lang={current.id} code={current.code} />
        </div>
      </div>
      <Callout tone="success" title="Why this works everywhere">
        Travsify is REST + JSON over HTTPS — the universal language of the web. There is nothing to install, no SDK
        to import, no native dependency. If your runtime can make an HTTP request (and they all can), you have
        access to every flight, hotel, tour, transfer, e-Visa and insurance plan we connect to.
      </Callout>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat k="13+" v="Languages · same one line" />
        <Stat k="0" v="SDK installs required" />
        <Stat k="1" v="Header. 1 endpoint. 1 key." />
      </div>
    </section>
  );
}

function Quickstart() {
  return (
    <section className="space-y-5">
      <H2 id="quickstart" icon={Rocket}>5-minute quickstart</H2>
      <P>You can call the sandbox the moment you sign up — no KYB required to start building.</P>
      <ol className="space-y-4 text-[15px]">
        <Step n={1} title="Create an account">
          Go to <Link to="/signup" className="font-semibold text-accent">signup</Link>. The moment you confirm your
          email, your sandbox API key is issued automatically.
        </Step>
        <Step n={2} title="Grab your sandbox key">
          Open <Link to="/api-keys" className="font-semibold text-accent">Dashboard → API keys</Link>. Copy the key
          that starts with <code className="rounded bg-surface px-1.5 py-0.5 text-xs">tsk_sandbox_</code>.
        </Step>
        <Step n={3} title="Make your first call">
          <Code lang="bash" code={`curl -X POST https://api.travsify.com/api/v1/flights/search \\
  -H "Authorization: Bearer tsk_sandbox_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": "LOS",
    "destination": "DXB",
    "departure_date": "2026-06-01",
    "adults": 1
  }'`} />
        </Step>
        <Step n={4} title="Book from the dashboard">
          Want to test a paid booking? Fund your USD wallet (Stripe) or NGN wallet (bank transfer) with $10, then
          use <Link to="/book" className="font-semibold text-accent">Dashboard → Book</Link> to confirm a real flight or hotel.
        </Step>
      </ol>
      <Callout tone="success" title="That's it — you're integrated">
        Sandbox returns the same JSON shape as live. When you're ready, swap your key prefix from
        <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">tsk_sandbox_</code>to
        <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">tsk_live_</code>and you're in production.
      </Callout>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-sm font-bold text-white">{n}</div>
      <div className="flex-1 space-y-2">
        <div className="font-display text-base font-bold text-primary">{title}</div>
        <div className="text-sm text-foreground/85">{children}</div>
      </div>
    </li>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="font-display text-2xl font-extrabold text-primary">{k}</div>
      <div className="text-xs text-muted-foreground">{v}</div>
    </div>
  );
}

function Authentication() {
  return (
    <section className="space-y-4">
      <H2 id="authentication" icon={KeyRound}>Authentication</H2>
      <P>
        Every request needs a bearer token in the <code className="rounded bg-surface px-1.5 py-0.5 text-xs">Authorization</code> header.
        Two key types — both available from your dashboard:
      </P>
      <div className="grid gap-3 sm:grid-cols-2">
        <KeyTile name="Sandbox key" prefix="tsk_sandbox_" desc="Free. Issued at signup. Identical responses to live, no real money moves." />
        <KeyTile name="Live key" prefix="tsk_live_" desc="Production traffic. Issued the moment your KYB is approved." />
      </div>
      <Code lang="bash" code={`curl https://api.travsify.com/api/v1/health \\
  -H "Authorization: Bearer tsk_sandbox_your_key_here"`} />
      <Callout tone="warn" title="Keep keys server-side">
        Never ship live keys in browser bundles or mobile apps. If a key ever leaks, revoke it from
        <Link to="/api-keys" className="ml-1 font-semibold text-accent">Dashboard → API keys</Link>.
      </Callout>
    </section>
  );
}

function KeyTile({ name, prefix, desc }: { name: string; prefix: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="font-display text-sm font-bold text-primary">{name}</div>
      <div className="mt-1 font-mono text-xs text-accent">{prefix}…</div>
      <div className="mt-2 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function WalletDocs() {
  return (
    <section className="space-y-4">
      <H2 id="wallet" icon={WalletIcon}>Wallet & funding</H2>
      <P>
        Every booking — sandbox or live, dashboard or API — is paid from your Travsify wallet. No post-paid billing,
        no surprise invoices. You see exactly what each booking cost before you confirm.
      </P>
      <ul className="ml-5 list-disc space-y-1.5 text-[15px] text-foreground/85">
        <li><strong>USD wallet</strong> — fund with card via Stripe, withdraw to any USD bank.</li>
        <li><strong>NGN wallet</strong> — fund via bank transfer to your dedicated Fincra virtual account, withdraw to any NGN bank.</li>
        <li>Wallet balance is debited automatically on booking; refunds credit back the same way.</li>
        <li>Your <strong>partner markup</strong> on each booking is paid into your wallet as profit, available for withdrawal.</li>
      </ul>
      <Callout title="How a booking flows">
        <ol className="ml-4 list-decimal space-y-1">
          <li>Customer books on your site → you call <code className="rounded bg-surface px-1 text-xs">/orders</code></li>
          <li>We debit <em>provider price + Travsify markup</em> from your wallet</li>
          <li>We credit <em>your partner markup</em> back as wallet profit</li>
          <li>You charge your customer whatever you want — you keep 100% of that</li>
        </ol>
      </Callout>
    </section>
  );
}

function Markups() {
  return (
    <section className="space-y-4">
      <H2 id="markups" icon={Sparkles}>Markups & pricing</H2>
      <P>Every price you see includes two layers of markup added on top of the supplier base price:</P>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="font-display text-sm font-bold text-primary">1. Travsify markup</div>
          <div className="mt-1 text-xs text-muted-foreground">Set by us per vertical. Covers supplier connection + platform.</div>
        </div>
        <div className="rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="font-display text-sm font-bold text-primary">2. Your partner markup</div>
          <div className="mt-1 text-xs text-muted-foreground">You set per vertical from <Link to="/markups" className="font-semibold text-accent">Dashboard → Markups</Link>. Paid to your wallet.</div>
        </div>
      </div>
      <Code lang="json" code={`// Every price response includes the breakdown
{
  "base_price": 800,
  "price": 870,
  "price_breakdown": {
    "provider_base": 800,
    "travsify_markup": 40,
    "partner_markup": 30,
    "total": 870,
    "currency": "USD"
  }
}`} />
    </section>
  );
}

function Vertical({ id, icon, title, desc, children }: {
  id: string; icon: typeof BookOpen; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <H2 id={id} icon={icon}>{title}</H2>
      <P>{desc}</P>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function EndpointBlock({ method, path, body, response }: { method: string; path: string; body: string; response: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-accent-foreground">{method}</span>
        <code className="font-mono text-xs text-foreground">{path}</code>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Request</div>
          <Code lang="json" code={body} />
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Response</div>
          <Code lang="json" code={response} />
        </div>
      </div>
    </div>
  );
}

function Webhooks() {
  return (
    <section className="space-y-4">
      <H2 id="webhooks" icon={Webhook}>Webhooks</H2>
      <P>
        We push events to your endpoint in real time. Configure your URL from the dashboard, then verify the signature header on every request.
      </P>
      <div className="rounded-xl border border-border bg-white p-4 text-sm" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Event types</div>
        <ul className="grid gap-1.5 text-foreground/85 sm:grid-cols-2">
          <li><code className="rounded bg-surface px-1.5 py-0.5 text-xs">booking.confirmed</code> — supplier confirmed</li>
          <li><code className="rounded bg-surface px-1.5 py-0.5 text-xs">booking.cancelled</code> — cancelled by you or supplier</li>
          <li><code className="rounded bg-surface px-1.5 py-0.5 text-xs">booking.refunded</code> — money returned to wallet</li>
          <li><code className="rounded bg-surface px-1.5 py-0.5 text-xs">booking.fulfilled</code> — affiliate verticals only</li>
          <li><code className="rounded bg-surface px-1.5 py-0.5 text-xs">wallet.credited</code> — funds arrived</li>
          <li><code className="rounded bg-surface px-1.5 py-0.5 text-xs">payout.completed</code> — withdrawal paid</li>
        </ul>
      </div>
      <Code lang="javascript" code={`// Verify the signature in your handler
import crypto from "crypto";

function verify(signatureHeader, rawBody, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}`} />
    </section>
  );
}

function Errors() {
  return (
    <section className="space-y-4">
      <H2 id="errors" icon={AlertTriangle}>Errors & retries</H2>
      <P>Errors are JSON. Status codes follow standard HTTP semantics.</P>
      <div className="overflow-hidden rounded-xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-2">Code</th><th className="px-4 py-2">Meaning</th><th className="px-4 py-2">What to do</th></tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            <Row c="400" m="validation_error" a="Fix the field highlighted in error.message and retry." />
            <Row c="401" m="invalid_api_key" a="Check the Authorization header. Re-issue from dashboard if needed." />
            <Row c="402" m="wallet_insufficient" a="Top up your wallet then retry. We never auto-charge cards." />
            <Row c="404" m="offer_expired" a="Search again — flight/hotel offers expire after ~15 minutes." />
            <Row c="429" m="rate_limited" a="Back off using the Retry-After header. Default limit: 120 req/min." />
            <Row c="5xx" m="provider_error" a="Idempotent retry safe. Use the same Idempotency-Key header." />
          </tbody>
        </table>
      </div>
      <Callout title="Idempotency">
        Send <code className="rounded bg-surface px-1.5 py-0.5 text-xs">Idempotency-Key: &lt;uuid&gt;</code> on every
        write call. We deduplicate retries for 24 hours so a network blip never double-books or double-charges.
      </Callout>
    </section>
  );
}

function Row({ c, m, a }: { c: string; m: string; a: string }) {
  return (
    <tr>
      <td className="px-4 py-2 font-mono text-xs font-bold">{c}</td>
      <td className="px-4 py-2 font-mono text-xs text-accent">{m}</td>
      <td className="px-4 py-2 text-xs">{a}</td>
    </tr>
  );
}

function GoingLive() {
  return (
    <section className="space-y-4">
      <H2 id="going-live" icon={CheckCircle2}>Going live</H2>
      <P>Four things to tick off before you flip the switch:</P>
      <ol className="space-y-3 text-[15px]">
        <LiveStep n={1} title="Submit KYB">
          Open <Link to="/kyc" className="font-semibold text-accent">Dashboard → Profile</Link>. Reviews complete in 24–72 hours.
        </LiveStep>
        <LiveStep n={2} title="Set your markups">
          Configure per-vertical partner markup at <Link to="/markups" className="font-semibold text-accent">Dashboard → Markups</Link>.
        </LiveStep>
        <LiveStep n={3} title="Fund your wallet">
          Top up USD or NGN at <Link to="/wallet" className="font-semibold text-accent">Dashboard → Wallet</Link>. Even $10 unlocks live bookings.
        </LiveStep>
        <LiveStep n={4} title="Swap your key">
          Replace <code className="rounded bg-surface px-1.5 py-0.5 text-xs">tsk_sandbox_</code> with <code className="rounded bg-surface px-1.5 py-0.5 text-xs">tsk_live_</code> in your environment. Done.
        </LiveStep>
      </ol>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link to="/signup" className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground btn-glow" style={{ boxShadow: "var(--shadow-accent)" }}>
          Create an account <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link to="/contact" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:border-accent hover:text-accent">
          Talk to us
        </Link>
      </div>
    </section>
  );
}

function LiveStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-success/15 font-display text-sm font-bold text-success">{n}</span>
      <div>
        <div className="font-display text-sm font-bold text-primary">{title}</div>
        <div className="mt-0.5 text-sm text-foreground/85">{children}</div>
      </div>
    </li>
  );
}
