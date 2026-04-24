import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Book, Plane, Building2, CreditCard, Shield, Globe2, Webhook, KeyRound, ArrowRight, Copy } from "lucide-react";
import { PageShell, PageHero } from "@/components/landing/PageShell";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
  head: () => ({
    meta: [
      { title: "Docs — Travsify NDC API Reference" },
      {
        name: "description",
        content:
          "Complete API reference for Travsify NDC. Authentication, flights, hotels, transfers, e-Visas, payments and webhooks — with copy-paste examples.",
      },
      { property: "og:title", content: "Travsify Docs — Ship faster" },
      {
        property: "og:description",
        content: "Endpoints, examples and SDK guides for the Travsify travel API.",
      },
    ],
  }),
});

const groups = [
  {
    title: "Getting started",
    items: [
      { icon: KeyRound, title: "Quickstart", desc: "From signup to your first booking in under 10 minutes." },
      { icon: Book, title: "Authentication", desc: "Bearer tokens, scopes and key rotation." },
      { icon: Webhook, title: "Webhooks", desc: "Receive real-time booking and payment events." },
    ],
  },
  {
    title: "Travel APIs",
    items: [
      { icon: Plane, title: "Flights", desc: "Search, price, book and ticket — NDC and EDIFACT." },
      { icon: Building2, title: "Hotels", desc: "1M+ properties with photos, rates and policies." },
      { icon: Globe2, title: "e-Visas", desc: "Apply, track and deliver visas in 90 seconds." },
      { icon: Shield, title: "Insurance", desc: "Per-trip cover with instant policy issuance." },
      { icon: CreditCard, title: "Payments", desc: "Multi-currency wallet, payouts and reconciliation." },
    ],
  },
];

const sample = `curl -X POST https://api.travsify.com/v2/flights/search \\
  -H "Authorization: Bearer $TRAVSIFY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": "LOS",
    "destination": "DXB",
    "date": "2026-06-12",
    "adults": 1
  }'`;

function DocsPage() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sample);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Documentation"
        title="Everything you need"
        highlight="to ship in production."
        description="Clean reference docs, copy-paste examples, and end-to-end guides for every travel vertical. No marketing fluff — just the bytes."
      >
        <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search the docs (try 'webhooks')"
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </div>
      </PageHero>

      {/* Quickstart code block */}
      <section className="border-b border-border bg-background py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="reveal mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Quickstart</div>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-primary">Your first request</h2>
            </div>
            <Link to="/developers" className="text-sm font-semibold text-accent story-link">
              View SDKs →
            </Link>
          </div>
          <div
            className="reveal overflow-hidden rounded-xl border border-border bg-primary-deep shadow-elevated"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-primary px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              </div>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 transition hover:border-accent hover:text-accent"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-white/90">{sample}</pre>
          </div>
        </div>
      </section>

      {/* Sections grid */}
      <section className="border-b border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="space-y-14">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="reveal mb-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{g.title}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((item, i) => (
                    <Link
                      key={item.title}
                      to="/contact"
                      className="reveal hover-lift group rounded-xl border border-border bg-white p-6"
                      style={{ boxShadow: "var(--shadow-soft)", transitionDelay: `${i * 60}ms` }}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-white">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 font-display text-lg font-bold text-primary">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                        Read more
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border bg-background py-16">
        <div className="reveal mx-auto max-w-4xl rounded-2xl border border-border bg-gradient-to-br from-primary to-primary-deep p-10 text-white shadow-elevated"
             style={{ boxShadow: "var(--shadow-elevated)" }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="font-display text-3xl font-extrabold">Need a hand integrating?</h3>
            <p className="max-w-xl text-white/70">
              Our solutions team will walk through your stack and have you booking real flights in a sandbox call.
            </p>
            <Link
              to="/contact"
              className="btn-glow inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
            >
              Talk to an engineer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
