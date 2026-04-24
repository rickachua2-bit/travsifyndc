import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, ArrowRight, Check, MessageSquare, Calendar, Briefcase } from "lucide-react";
import { PageShell, PageHero } from "@/components/landing/PageShell";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact us — Travsify NDC" },
      {
        name: "description",
        content:
          "Talk to Travsify NDC. Get API access, request a demo, or speak with our solutions engineers about scaling your travel business.",
      },
      { property: "og:title", content: "Contact Travsify — Let's build together" },
      {
        property: "og:description",
        content: "Talk to sales, get API access or schedule a technical walkthrough.",
      },
    ],
  }),
});

const reasons = [
  { value: "api", label: "Get API access", icon: Briefcase },
  { value: "demo", label: "Schedule a demo", icon: Calendar },
  { value: "support", label: "Technical question", icon: MessageSquare },
];

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState("api");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="We reply within 24 hours"
        title="Let's build the future"
        highlight="of travel together."
        description="Whether you need API access, a personalized demo, or just want to talk shop — our team is here. Real humans, fast replies."
      />

      <section className="border-b border-border bg-background py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1.3fr]">
          {/* Left: contact details */}
          <div className="reveal space-y-6">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-primary">Get in touch</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick the channel that suits you. Sales replies within 4 hours during business hours.
              </p>
            </div>

            {[
              { icon: Mail, title: "Email", value: "hello@travsify.com", link: "mailto:hello@travsify.com" },
              { icon: Phone, title: "Phone", value: "+234 800 TRAVSIFY", link: "tel:+2348008728743" },
              { icon: MapPin, title: "HQ", value: "Lagos, Nigeria · Dubai, UAE", link: undefined },
            ].map((c) => (
              <div
                key={c.title}
                className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-accent"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.title}</div>
                  {c.link ? (
                    <a href={c.link} className="font-display font-bold text-primary hover:text-accent">
                      {c.value}
                    </a>
                  ) : (
                    <div className="font-display font-bold text-primary">{c.value}</div>
                  )}
                </div>
              </div>
            ))}

            <div
              className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary-deep p-6 text-white shadow-elevated"
              style={{ boxShadow: "var(--shadow-elevated)" }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Already a developer?</div>
              <div className="mt-2 font-display text-lg font-bold">
                Skip the form — try the live demo first.
              </div>
              <Link
                to="/demo"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-95"
              >
                Open live demo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right: form */}
          <div
            className="reveal rounded-2xl border border-border bg-white p-8 shadow-elevated"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-scale-in">
                <div className="flex h-16 w-16 animate-pulse-glow items-center justify-center rounded-full bg-success text-white">
                  <Check className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-display text-2xl font-extrabold text-primary">Message received.</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Thanks — a real human from our team will reach out within 24 hours. In the meantime, browse the docs or play with the live demo.
                </p>
                <div className="mt-6 flex gap-3">
                  <Link
                    to="/docs"
                    className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
                  >
                    Read docs
                  </Link>
                  <Link
                    to="/demo"
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-95"
                  >
                    Try the demo
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    What do you need?
                  </label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {reasons.map((r) => (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => setReason(r.value)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${
                          reason === r.value
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-white text-muted-foreground hover:border-accent/40"
                        }`}
                      >
                        <r.icon className="h-4 w-4" />
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" placeholder="Ada Lovelace" required />
                  <Field label="Work email" placeholder="ada@company.com" type="email" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company" placeholder="Travsify Travel Co." />
                  <Field label="Country" placeholder="Nigeria" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tell us a bit more
                  </label>
                  <textarea
                    rows={4}
                    placeholder="What are you building? Expected monthly volume?"
                    className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-glow group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-95"
                >
                  Send message <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  By submitting you agree to our terms. We never share your data.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        {...props}
        className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
