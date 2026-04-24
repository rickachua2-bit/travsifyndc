import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plane, Building2, MapPin, Car, Globe2, Shield,
  Search, ArrowRight, Loader2, Check, Zap,
} from "lucide-react";
import { PageShell, PageHero } from "@/components/landing/PageShell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Book travel — Travsify NDC" },
      { name: "description", content: "Search and book flights, hotels, tours, transfers, e-Visas and insurance through one unified API. Try it live, no signup required." },
      { property: "og:title", content: "Book travel with Travsify — one API, six products" },
      { property: "og:description", content: "Run a live search across 6 travel verticals and watch the API respond in milliseconds." },
    ],
  }),
});

type Vertical = "flights" | "hotels" | "tours" | "transfers" | "evisas" | "insurance";

const TABS: { id: Vertical; label: string; icon: typeof Plane }[] = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: Building2 },
  { id: "tours", label: "Tours", icon: MapPin },
  { id: "transfers", label: "Transfers", icon: Car },
  { id: "evisas", label: "e-Visas", icon: Globe2 },
  { id: "insurance", label: "Insurance", icon: Shield },
];

interface Result {
  id: string;
  [k: string]: unknown;
}

function DemoPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Vertical>("flights");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [source, setSource] = useState<"live" | "fallback" | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  async function runSearch(vertical: Vertical = tab) {
    setLoading(true);
    setResults(null);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/public/demo-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical, origin: "LOS", destination: "DXB", date: "2026-06-12", pax: 1, nationality: "NG" }),
      });
      const json = await res.json();
      setSource(json.source ?? "fallback");
      setResults(json.results ?? []);
    } catch {
      setSource("fallback");
      setResults([]);
    } finally {
      setLatency(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <PageHero
        eyebrow={isAuthenticated ? "Try it live · Open to your dashboard to book for real" : "Live demo · No signup"}
        title="One API."
        highlight="Six travel products. Live."
        description="Search flights, hotels, tours, transfers, e-Visas and insurance — all behind one schema. Test here, then go live with your wallet."
      >
        {isAuthenticated ? (
          <Link
            to="/book"
            className="btn-glow group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
            style={{ boxShadow: "var(--shadow-accent)" }}
          >
            Book from your wallet <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <Link
            to="/get-api-access"
            className="btn-glow group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
            style={{ boxShadow: "var(--shadow-accent)" }}
          >
            Get my API key <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
        >
          See the docs
        </Link>
      </PageHero>

      <section className="border-b border-border bg-surface py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="reveal overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-elevated)" }}>
            {/* Tabs */}
            <div className="flex flex-wrap items-center border-b border-border bg-surface px-2">
              <div className="flex flex-wrap">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTab(t.id); setResults(null); setSource(null); }}
                      className={`flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold capitalize transition ${
                        active ? "border-accent text-primary" : "border-transparent text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="ml-auto flex items-center gap-3 px-3 py-4 text-[11px] text-muted-foreground">
                {source === "live" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 font-bold text-success">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-success" /> Live backend
                  </span>
                ) : source === "fallback" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2 py-0.5 font-bold text-accent">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" /> Demo mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-bold text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Idle
                  </span>
                )}
                {latency !== null && <span className="font-mono">{latency}ms</span>}
              </div>
            </div>

            {/* Search bar */}
            <div className="grid gap-3 border-b border-border bg-white p-5 sm:grid-cols-4">
              {getQueryFields(tab).map((f) => (
                <div key={f.label} className="rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</div>
                  <div className="font-display font-bold text-primary">{f.value}</div>
                </div>
              ))}
              <button
                onClick={() => runSearch()}
                disabled={loading}
                className="btn-glow inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-95 disabled:opacity-70"
                style={{ boxShadow: "var(--shadow-accent)" }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Searching…" : "Search"}
              </button>
            </div>

            {/* Results */}
            <div className="bg-surface/40 p-5">
              {loading && (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 overflow-hidden rounded-lg border border-border bg-white">
                      <div className="h-full w-full shimmer" />
                    </div>
                  ))}
                </div>
              )}
              {!loading && results === null && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Zap className="h-8 w-8 text-accent" />
                  <p className="mt-3 font-display text-base font-bold text-primary">Hit search to run a live request</p>
                  <p className="mt-1 text-sm text-muted-foreground">No signup. No card. Same response shape across every vertical.</p>
                </div>
              )}
              {!loading && results && results.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No results.</p>
              )}
              {!loading && results && results.length > 0 && <ResultsList vertical={tab} items={results} />}
            </div>
          </div>

          <p className="reveal mt-6 text-center text-xs text-muted-foreground">
            Sandbox responses are real or representative inventory. Live keys return your contracted suppliers.
          </p>
        </div>
      </section>

      {/* Why it matters */}
      <section className="border-b border-border bg-background py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { title: "Sub-200ms responses", desc: "Edge-deployed, globally cached." },
              { title: "Real inventory", desc: "500+ airlines, 1M+ hotels, 12k+ tours." },
              { title: "One schema", desc: "Same shape across every vertical." },
            ].map((b, i) => (
              <div key={b.title} className="reveal rounded-xl border border-border bg-white p-6 hover-lift" style={{ boxShadow: "var(--shadow-soft)", transitionDelay: `${i * 80}ms` }}>
                <Check className="h-5 w-5 text-success" />
                <div className="mt-3 font-display text-lg font-bold text-primary">{b.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function getQueryFields(vertical: Vertical) {
  switch (vertical) {
    case "flights":
      return [
        { label: "From", value: "Lagos (LOS)" },
        { label: "To", value: "Dubai (DXB)" },
        { label: "Date", value: "Jun 12, 2026" },
      ];
    case "hotels":
      return [
        { label: "City", value: "Dubai" },
        { label: "Check-in", value: "Jun 12" },
        { label: "Check-out", value: "Jun 18" },
      ];
    case "tours":
      return [
        { label: "City", value: "Dubai" },
        { label: "Date", value: "Jun 13" },
        { label: "Pax", value: "2 adults" },
      ];
    case "transfers":
      return [
        { label: "From", value: "DXB Airport" },
        { label: "To", value: "Downtown Dubai" },
        { label: "Pax", value: "2 + bags" },
      ];
    case "evisas":
      return [
        { label: "Destination", value: "United Arab Emirates" },
        { label: "Nationality", value: "Nigerian" },
        { label: "Travel date", value: "Jun 12" },
      ];
    case "insurance":
      return [
        { label: "Trip type", value: "International" },
        { label: "Length", value: "6 days" },
        { label: "Travelers", value: "1 adult" },
      ];
  }
}

function ResultsList({ vertical, items }: { vertical: Vertical; items: Result[] }) {
  return (
    <div className="space-y-2">
      {items.map((r, i) => (
        <div
          key={String(r.id)}
          className="animate-fade-in-up flex items-center justify-between rounded-lg border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <Left vertical={vertical} r={r} />
          <Right vertical={vertical} r={r} />
        </div>
      ))}
    </div>
  );
}

function Left({ vertical, r }: { vertical: Vertical; r: Result }) {
  const code = (s?: string) => (s ?? "").slice(0, 2).toUpperCase();
  switch (vertical) {
    case "flights":
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-deep text-xs font-bold text-white">{code(r.carrier as string)}</div>
          <div>
            <div className="font-display text-sm font-bold text-primary">{String(r.carrier)}</div>
            <div className="text-xs text-muted-foreground">{String(r.route)} · {String(r.duration)} · {(r.stops as number) === 0 ? "Non-stop" : `${r.stops} stop`}</div>
          </div>
        </div>
      );
    case "hotels":
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-gradient-to-br from-accent/30 to-primary/30" />
          <div>
            <div className="font-display text-sm font-bold text-primary">{String(r.name)}</div>
            <div className="text-xs text-muted-foreground">{String(r.city)} · ★ {String(r.rating)}</div>
          </div>
        </div>
      );
    case "tours":
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent"><MapPin className="h-5 w-5" /></div>
          <div>
            <div className="font-display text-sm font-bold text-primary">{String(r.name)}</div>
            <div className="text-xs text-muted-foreground">{String(r.city)} · {String(r.duration)}</div>
          </div>
        </div>
      );
    case "transfers":
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent"><Car className="h-5 w-5" /></div>
          <div>
            <div className="font-display text-sm font-bold text-primary">{String(r.type)}</div>
            <div className="text-xs text-muted-foreground">{String(r.from)} → {String(r.to)} · {String(r.eta)}</div>
          </div>
        </div>
      );
    case "evisas":
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent"><Globe2 className="h-5 w-5" /></div>
          <div>
            <div className="font-display text-sm font-bold text-primary">{String(r.country)}</div>
            <div className="text-xs text-muted-foreground">Processing · {String(r.processing)}</div>
          </div>
        </div>
      );
    case "insurance":
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent"><Shield className="h-5 w-5" /></div>
          <div>
            <div className="font-display text-sm font-bold text-primary">{String(r.plan)}</div>
            <div className="text-xs text-muted-foreground">{String(r.cover)}</div>
          </div>
        </div>
      );
  }
}

function Right({ vertical, r }: { vertical: Vertical; r: Result }) {
  const price = r.price as number | undefined;
  const ccy = (r.currency as string | undefined) ?? "USD";
  const suffix = vertical === "hotels" ? "/nt" : vertical === "insurance" ? "/trip" : "";
  return (
    <div className="text-right">
      <div className="font-display text-lg font-extrabold text-primary">{ccy === "USD" ? "$" : ccy + " "}{price}{suffix}</div>
      <div className="text-[10px] text-success">Bookable now</div>
    </div>
  );
}
