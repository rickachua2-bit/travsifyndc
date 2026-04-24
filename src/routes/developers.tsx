import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Code2, Webhook, Boxes, Terminal, GitBranch, Shield } from "lucide-react";
import { PageShell, PageHero } from "@/components/landing/PageShell";

export const Route = createFileRoute("/developers")({
  component: DevelopersPage,
  head: () => ({
    meta: [
      { title: "Developers — Travsify NDC" },
      {
        name: "description",
        content:
          "Build on Travsify NDC. Clean REST APIs, official SDKs, sandbox keys in 60 seconds, and real-time webhooks for every booking event.",
      },
      { property: "og:title", content: "Travsify Developers — Travel APIs that just work" },
      {
        property: "og:description",
        content: "Sandbox in 60 seconds. SDKs in JS, Python, PHP & Go. Webhooks, idempotency, and 99.99% uptime.",
      },
    ],
  }),
});

const features = [
  { icon: Code2, title: "REST + JSON", desc: "Predictable resources, intuitive verbs, helpful errors. Built the way modern engineers expect." },
  { icon: Boxes, title: "Sandbox & live", desc: "Two parallel environments. Switch with a single header — no separate accounts." },
  { icon: Webhook, title: "Realtime webhooks", desc: "Booking, payment, refund and visa events delivered with retries and signatures." },
  { icon: Terminal, title: "First-class SDKs", desc: "JavaScript, TypeScript, Python, PHP and Go. Auto-generated and always in sync." },
  { icon: GitBranch, title: "Idempotency & retries", desc: "Safe to retry every write. Versioned, backwards-compatible APIs you can trust." },
  { icon: Shield, title: "Enterprise security", desc: "SOC 2 ready, PCI-DSS Level 1, encryption at rest and in transit." },
];

const langs = [
  { name: "JS", color: "bg-yellow-400 text-black" },
  { name: "TS", color: "bg-blue-500 text-white" },
  { name: "PY", color: "bg-blue-700 text-white" },
  { name: "PHP", color: "bg-indigo-500 text-white" },
  { name: "GO", color: "bg-cyan-500 text-white" },
];

function DevelopersPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Built for developers"
        title="The travel API"
        highlight="engineers actually love."
        description="Drop in one SDK and ship flights, hotels, transfers, e-Visas and insurance in an afternoon. No vendor calls. No NDA. No friction."
      >
        <Link
          to="/contact"
          className="btn-glow group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
          style={{ boxShadow: "var(--shadow-accent)" }}
        >
          Get sandbox key <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
        >
          Read the docs
        </Link>
      </PageHero>

      {/* Code + features */}
      <section className="border-b border-border bg-background py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div className="reveal">
              <h2 className="font-display text-3xl font-extrabold leading-tight text-primary md:text-4xl">
                Search a flight in <span className="text-gradient-accent">5 lines.</span>
              </h2>
              <p className="mt-4 max-w-md text-base text-muted-foreground">
                Authenticate, query, render. Our SDKs handle pagination, retries, currency conversion and rate-limit backoff for you.
              </p>
              <div className="mt-8 flex gap-2">
                {langs.map((l) => (
                  <div
                    key={l.name}
                    className={`flex h-10 w-10 items-center justify-center rounded-md font-mono text-xs font-bold transition hover:-translate-y-1 ${l.color}`}
                  >
                    {l.name}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="reveal overflow-hidden rounded-xl border border-border bg-primary-deep shadow-elevated"
              style={{ boxShadow: "var(--shadow-elevated)" }}
            >
              <div className="flex border-b border-white/10 bg-primary px-4">
                {["Node.js", "Python", "cURL"].map((t, i) => (
                  <button
                    key={t}
                    className={`border-b-2 px-4 py-3 text-xs font-medium transition ${
                      i === 0 ? "border-accent text-white" : "border-transparent text-white/50 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 py-3">
                  <span className="rounded bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">200 OK</span>
                  <span className="text-[10px] text-white/50">154ms</span>
                </div>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-white/90">
{`import { Travsify } from "@travsify/sdk";

const tx = new Travsify(process.env.TRAVSIFY_KEY);

const flights = await tx.flights.search({
  origin: "LOS",
  destination: "DXB",
  date: "2026-06-12",
  adults: 1,
});`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-b border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold leading-tight text-primary md:text-4xl">
              Everything you need. <span className="text-gradient-accent">Nothing you don't.</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              The primitives you'd build yourself — already shipped, tested, and battle-proven.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="reveal hover-lift rounded-xl border border-border bg-white p-6"
                style={{ boxShadow: "var(--shadow-soft)", transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-primary">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent story-link"
            >
              See it in action <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
