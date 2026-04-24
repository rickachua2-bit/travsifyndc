import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Rocket, ShieldCheck, Wallet as WalletIcon, KeyRound, CheckCircle2, Code2, Zap } from "lucide-react";
import { PageShell, PageHero } from "@/components/landing/PageShell";

export const Route = createFileRoute("/developers")({
  component: DevelopersPage,
  head: () => ({
    meta: [
      { title: "Developers — Travsify NDC" },
      { name: "description", content: "Go from sandbox to live in 4 steps. SDKs, quickstart, and a clear path to production for the Travsify travel API." },
      { property: "og:title", content: "Travsify Developers — Ship a travel product this weekend" },
      { property: "og:description", content: "Sandbox at signup, KYB in 24h, fund your wallet, swap your key. That's the whole path to live." },
    ],
  }),
});

const steps = [
  { n: 1, icon: Rocket, title: "Sign up — sandbox unlocks instantly", desc: "Confirm your email and your sandbox API key is issued automatically. Build your full integration before anyone reviews anything.", to: "/signup", cta: "Create account" },
  { n: 2, icon: ShieldCheck, title: "Submit KYB — reviewed in 24–72h", desc: "Tell us about your business. We email the moment we approve and your live key appears in the dashboard.", to: "/kyc", cta: "Open KYB" },
  { n: 3, icon: WalletIcon, title: "Fund your wallet", desc: "Top up USD via Stripe or NGN via Fincra bank transfer. Every booking debits your wallet — no post-paid invoices, no surprises.", to: "/wallet", cta: "Fund wallet" },
  { n: 4, icon: KeyRound, title: "Swap sandbox → live key", desc: "Replace tsk_sandbox_ with tsk_live_ in your env vars. That's the whole production cutover.", to: "/api-keys", cta: "Get keys" },
] as const;

function DevelopersPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Developers · Go live in 4 steps"
        title="Build a travel product"
        highlight="this weekend."
        description="One REST API. Six verticals. Sandbox the moment you sign up. Live the moment we approve KYB."
      >
        <Link to="/signup" className="btn-glow group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground" style={{ boxShadow: "var(--shadow-accent)" }}>
          Start building <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link to="/docs" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground hover:-translate-y-0.5 hover:border-accent hover:text-accent">
          Read the docs
        </Link>
      </PageHero>

      <section className="border-b border-border bg-surface py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">The path to production</div>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-primary md:text-4xl">From signup to live in four moves</h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-2">
            {steps.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white"><s.icon className="h-5 w-5" /></div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Step {s.n}</div>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-primary">{s.title}</h3>
                <p className="mt-1.5 text-sm text-foreground/80">{s.desc}</p>
                <Link to={s.to} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                  {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Feature icon={Code2} title="Two-line SDK" desc="Drop our script tag, call Travsify.init(key) and you're searching live inventory." />
            <Feature icon={Zap} title="Idempotent writes" desc="Every booking call accepts an Idempotency-Key. Retry safely after any network blip." />
            <Feature icon={CheckCircle2} title="Sandbox = Live" desc="Identical JSON shape. Build against sandbox, ship to live by swapping a key prefix." />
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl bg-primary p-6" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">Drop-in script</div>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-white">{`<script src="https://api.travsify.com/sdk.js"></script>
<script>
  Travsify.init("tsk_sandbox_your_key")
    .flights.search({ origin: "LOS", destination: "DXB", departure_date: "2026-06-01", adults: 1 })
    .then(console.log);
</script>`}</pre>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/docs" className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground btn-glow" style={{ boxShadow: "var(--shadow-accent)" }}>
              Open the full docs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link to="/demo" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:border-accent hover:text-accent">
              Try the live booking demo
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Code2; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon className="h-5 w-5" /></div>
      <h3 className="mt-3 font-display text-base font-bold text-primary">{title}</h3>
      <p className="mt-1 text-sm text-foreground/80">{desc}</p>
    </div>
  );
}
