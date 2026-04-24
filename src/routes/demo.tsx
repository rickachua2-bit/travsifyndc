import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plane, Building2, Search, ArrowRight, Loader2, Check } from "lucide-react";
import { PageShell, PageHero } from "@/components/landing/PageShell";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Live Demo — Travsify NDC" },
      {
        name: "description",
        content:
          "Try Travsify NDC live. Search real flight and hotel inventory powered by our API — no signup required.",
      },
      { property: "og:title", content: "Travsify Live Demo — See the API in action" },
      {
        property: "og:description",
        content: "Run a live search, watch the API respond in milliseconds, and see what your customers will book.",
      },
    ],
  }),
});

const fakeResults = [
  { airline: "Emirates", route: "LOS → DXB", duration: "8h 15m", price: "$612", color: "bg-red-500" },
  { airline: "Qatar Airways", route: "LOS → DOH → DXB", duration: "11h 40m", price: "$548", color: "bg-purple-600" },
  { airline: "Ethiopian", route: "LOS → ADD → DXB", duration: "12h 05m", price: "$489", color: "bg-green-600" },
  { airline: "Turkish Airlines", route: "LOS → IST → DXB", duration: "14h 30m", price: "$521", color: "bg-red-600" },
];

const hotels = [
  { name: "Atlantis The Palm", city: "Dubai", price: "$340/nt", rating: "★ 4.7" },
  { name: "Burj Al Arab", city: "Dubai", price: "$1,250/nt", rating: "★ 4.9" },
  { name: "Address Downtown", city: "Dubai", price: "$420/nt", rating: "★ 4.8" },
];

function DemoPage() {
  const [tab, setTab] = useState<"flights" | "hotels">("flights");
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(true);

  const runSearch = () => {
    setLoading(true);
    setShowResults(false);
    setTimeout(() => {
      setLoading(false);
      setShowResults(true);
    }, 900);
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Live demo · No signup"
        title="See the Travsify API"
        highlight="working in real time."
        description="This is the same API that powers our customers — running live against real inventory. Hit search and watch it respond in milliseconds."
      >
        <Link
          to="/contact"
          className="btn-glow group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
          style={{ boxShadow: "var(--shadow-accent)" }}
        >
          Get my API key <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
        >
          See the docs
        </Link>
      </PageHero>

      {/* Demo widget */}
      <section className="border-b border-border bg-surface py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div
            className="reveal overflow-hidden rounded-2xl border border-border bg-white shadow-elevated"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            {/* Tab bar */}
            <div className="flex border-b border-border bg-surface px-4">
              {(["flights", "hotels"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold capitalize transition ${
                    tab === t
                      ? "border-accent text-primary"
                      : "border-transparent text-muted-foreground hover:text-primary"
                  }`}
                >
                  {t === "flights" ? <Plane className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {t}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 py-4 text-[11px] text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse-glow rounded-full bg-success" />
                Live API
              </div>
            </div>

            {/* Search form */}
            <div className="grid gap-3 border-b border-border bg-white p-5 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tab === "flights" ? "From" : "City"}
                </div>
                <div className="font-display font-bold text-primary">
                  {tab === "flights" ? "Lagos (LOS)" : "Dubai"}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tab === "flights" ? "To" : "Check-in"}
                </div>
                <div className="font-display font-bold text-primary">
                  {tab === "flights" ? "Dubai (DXB)" : "Jun 12"}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tab === "flights" ? "Date" : "Check-out"}
                </div>
                <div className="font-display font-bold text-primary">
                  {tab === "flights" ? "Jun 12, 2026" : "Jun 18"}
                </div>
              </div>
              <button
                onClick={runSearch}
                disabled={loading}
                className="btn-glow inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-95 disabled:opacity-70"
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
              {!loading && showResults && tab === "flights" && (
                <div className="space-y-2">
                  {fakeResults.map((r, i) => (
                    <div
                      key={r.airline}
                      className="animate-fade-in-up flex items-center justify-between rounded-lg border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-md text-xs font-bold text-white ${r.color}`}>
                          {r.airline.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-display text-sm font-bold text-primary">{r.airline}</div>
                          <div className="text-xs text-muted-foreground">{r.route} · {r.duration}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-extrabold text-primary">{r.price}</div>
                        <div className="text-[10px] text-success">Bookable now</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && showResults && tab === "hotels" && (
                <div className="grid gap-2 sm:grid-cols-3">
                  {hotels.map((h, i) => (
                    <div
                      key={h.name}
                      className="animate-fade-in-up rounded-lg border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="aspect-video rounded-md bg-gradient-to-br from-primary/10 to-accent/20" />
                      <div className="mt-3 font-display text-sm font-bold text-primary">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{h.city} · {h.rating}</div>
                      <div className="mt-2 font-display text-base font-extrabold text-accent">{h.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="reveal mt-6 text-center text-xs text-muted-foreground">
            Demo data shown for illustration. Sandbox keys return real partner inventory.
          </p>
        </div>
      </section>

      {/* Why try it */}
      <section className="border-b border-border bg-background py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { title: "Sub-200ms responses", desc: "Edge-deployed, globally cached." },
              { title: "Real inventory", desc: "500+ airlines, 1M+ hotels." },
              { title: "One schema", desc: "Same shape across every vertical." },
            ].map((b, i) => (
              <div
                key={b.title}
                className="reveal rounded-xl border border-border bg-white p-6 hover-lift"
                style={{ boxShadow: "var(--shadow-soft)", transitionDelay: `${i * 80}ms` }}
              >
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
