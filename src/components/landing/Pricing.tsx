import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    per: "",
    features: ["Sandbox API access", "Up to 1,000 calls / month", "Community support"],
    cta: "Start free",
    to: "/contact" as const,
    popular: false,
  },
  {
    name: "Growth",
    price: "$49",
    per: "per month",
    features: ["Live API access", "All travel verticals", "Webhooks & wallet", "Email support"],
    cta: "Start growing",
    to: "/contact" as const,
    popular: true,
  },
  {
    name: "Scale",
    price: "$199",
    per: "per month",
    features: ["High-volume limits", "Advanced analytics", "Priority support", "Custom margins"],
    cta: "Scale up",
    to: "/contact" as const,
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    features: ["Dedicated infra & SLA", "Custom integrations", "White-glove onboarding"],
    cta: "Talk to sales",
    to: "/contact" as const,
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="reveal mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">15</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pricing</span>
        </div>
        <div className="reveal mb-10 grid gap-6 lg:grid-cols-[1fr_2fr] lg:items-center">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            Pricing that grows <span className="text-gradient-accent">with you.</span>
          </h2>
          <div className="flex justify-end">
            <div className="inline-flex rounded-full border border-border bg-white p-1 text-xs font-semibold">
              <button className="rounded-full bg-primary px-4 py-1.5 text-white">Monthly</button>
              <button className="rounded-full px-4 py-1.5 text-muted-foreground transition hover:text-primary">
                Yearly · Save 20%
              </button>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t, i) => (
            <div
              key={t.name}
              className={`reveal relative rounded-2xl border bg-white p-6 hover-lift ${
                t.popular ? "border-accent" : "border-border"
              }`}
              style={{
                boxShadow: t.popular ? "var(--shadow-elevated)" : "var(--shadow-soft)",
                transitionDelay: `${i * 100}ms`,
              }}
            >
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground shadow-accent">
                  Most Popular
                </div>
              )}
              <div className="font-display text-lg font-bold text-primary">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-extrabold text-primary">{t.price}</span>
                {t.per && <span className="text-xs text-muted-foreground">{t.per}</span>}
              </div>
              <ul className="my-6 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={t.to}
                className={`block w-full rounded-md py-2 text-center text-sm font-semibold transition ${
                  t.popular
                    ? "bg-accent text-accent-foreground hover:opacity-90"
                    : "border border-border bg-white text-foreground hover:border-accent hover:text-accent"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
