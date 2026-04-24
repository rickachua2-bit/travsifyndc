import { createFileRoute, Link } from "@tanstack/react-router";
import { useProfile } from "@/hooks/useProfile";
import { Clock, ShieldCheck, AlertCircle, Copy, ArrowRight, BookOpen, PlayCircle, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";
import { PartnerShell } from "@/components/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/pending-review")({
  component: PendingReviewPage,
  head: () => ({
    meta: [
      { title: "Application status — Travsify NDC" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PendingReviewPage() {
  const { profile } = useProfile();

  if (!profile) return null;

  const status = profile.kyc_status;
  const sandboxKey = profile.sandbox_api_key ?? "tsk_sandbox_••••••••";

  return (
    <PartnerShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="animate-fade-in-up">
          <StatusBanner status={status} reason={profile.rejection_reason} />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* Sandbox key */}
          <section className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-lg font-bold text-primary">Build now with sandbox access</h2>
                <p className="text-xs text-muted-foreground">Full feature parity. Zero charge. Live keys unlock on KYC approval.</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 font-mono text-xs text-foreground">
              <span className="truncate">{sandboxKey}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(sandboxKey); toast.success("Sandbox key copied"); }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/demo" className="btn-glow inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground" style={{ boxShadow: "var(--shadow-accent)" }}>
                <PlayCircle className="h-3.5 w-3.5" /> Try the live demo
              </Link>
              <Link to="/docs" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
                <BookOpen className="h-3.5 w-3.5" /> Read the docs
              </Link>
              <Link to="/developers" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
                SDKs & quickstart <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Tile title="6 verticals" desc="Flights, hotels, tours, transfers, e-Visas, insurance" />
              <Tile title="Webhooks" desc="Booking, refund, fulfilment events ready to wire up" />
              <Tile title="Idempotency" desc="Safe retries on every write endpoint" />
            </div>
          </section>

          {/* Application summary */}
          <section className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-lg font-bold text-primary">Your application</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Item k="Company" v={profile.legal_name ?? profile.company ?? "—"} />
              <Item k="Country" v={profile.incorporation_country ?? "—"} />
              <Item k="Business type" v={profile.business_type ?? "—"} />
              <Item k="Website" v={profile.website ?? "—"} />
              <Item k="Verticals" v={profile.target_verticals?.join(", ") || "—"} />
              <Item k="Volume" v={profile.monthly_volume ?? "—"} />
              <Item k="Submitted" v={profile.kyc_submitted_at ? new Date(profile.kyc_submitted_at).toLocaleString() : "—"} />
            </dl>

            {status === "rejected" && (
              <Link to="/kyc" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground btn-glow" style={{ boxShadow: "var(--shadow-accent)" }}>
                <RefreshCw className="h-4 w-4" /> Update & resubmit
              </Link>
            )}

            <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Need help?</p>
              <p className="mt-1">Email <a href="mailto:onboarding@travsify.com" className="font-semibold text-accent">onboarding@travsify.com</a> or <Link to="/contact" className="font-semibold text-accent">message us</Link>.</p>
            </div>
          </section>
        </div>
      </div>
    </PartnerShell>
  );
}

function StatusBanner({ status, reason }: { status: string; reason: string | null }) {
  if (status === "rejected") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-destructive/15 text-destructive"><AlertCircle className="h-5 w-5" /></div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-destructive">Application not approved</div>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-primary md:text-3xl">We couldn't verify your business</h1>
            {reason && (
              <p className="mt-3 rounded-md border border-destructive/20 bg-white p-3 text-sm text-foreground">
                <span className="font-semibold">Reviewer note: </span>{reason}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">Update your KYC details and resubmit. We'll re-review within 24 hours.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-accent/15 text-accent"><Clock className="h-5 w-5" /></div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{status === "under_review" ? "Under review" : "Application received"}</div>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-primary md:text-3xl">
            We're reviewing your <span className="text-gradient-accent">application</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Typical review: <span className="font-semibold text-foreground">24–72 hours</span>. We'll email you the moment it's decided. Meanwhile, your sandbox is live — start building.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white px-3 py-1 text-xs font-semibold text-accent">
            <Mail className="h-3 w-3" /> We'll email decisions to your inbox
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="text-right text-sm text-foreground">{v}</dd>
    </div>
  );
}

function Tile({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="font-display text-sm font-bold text-primary">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
