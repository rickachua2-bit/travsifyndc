import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Eye, EyeOff, Sparkles, ShieldCheck, KeyRound, Lock } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/api-keys")({
  component: ApiKeysPage,
  head: () => ({ meta: [{ title: "API keys — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

function ApiKeysPage() {
  const { profile } = useProfile();
  const [showLive, setShowLive] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  const status = profile?.kyc_status ?? "draft";
  const approved = status === "approved";
  const sandbox = profile?.sandbox_api_key ?? "";
  const live = profile?.live_api_key ?? "";

  function copy(label: string, value: string) {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }
  function masked(v: string) {
    if (!v) return "—";
    const parts = v.split("_");
    const tail = v.slice(-6);
    return `${parts.slice(0, 2).join("_")}_${"•".repeat(20)}${tail}`;
  }

  return (
    <PartnerShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">API access</div>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">API keys</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use these to authenticate every request. Keep them server-side — never ship live keys to a browser bundle.
            </p>
          </div>
          <Link to="/docs" className="hidden rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent sm:inline-flex">Read the docs</Link>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <KeyCard
            tone="sandbox"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Sandbox API key"
            desc="Safe for testing. Never charged. Identical responses to live."
            value={sandbox}
            shown={showSandbox}
            onToggle={() => setShowSandbox((s) => !s)}
            onCopy={() => copy("Sandbox key", sandbox)}
            masked={masked(sandbox)}
          />
          {approved ? (
            <KeyCard
              tone="live"
              icon={<Sparkles className="h-5 w-5" />}
              title="Live API key"
              desc="Production traffic. Real bookings. Real money."
              value={live}
              shown={showLive}
              onToggle={() => setShowLive((s) => !s)}
              onCopy={() => copy("Live key", live)}
              masked={masked(live)}
            />
          ) : (
            <LiveLockedCard />
          )}
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h2 className="font-display text-base font-bold text-primary">Integrate in two lines</h2>
          <p className="text-xs text-muted-foreground">Drop this into any HTML page — that's the full integration.</p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-primary p-4 font-mono text-xs leading-relaxed text-white">
{`<script src="${typeof window !== "undefined" ? window.location.origin : ""}/sdk.js"></script>
<script>Travsify.init("${approved && live ? live : sandbox || "tsk_sandbox_…"}").flights.search({origin:"LOS",destination:"DXB",departure_date:"2026-06-01",adults:1}).then(console.log)</script>`}
          </pre>
          <button
            onClick={() => copy("Snippet", `<script src="${window.location.origin}/sdk.js"></script>\n<script>Travsify.init("${approved && live ? live : sandbox || "tsk_sandbox_…"}").flights.search({origin:"LOS",destination:"DXB",departure_date:"2026-06-01",adults:1}).then(console.log)</script>`)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent hover:text-accent"
          >
            <Copy className="h-3 w-3" /> Copy snippet
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h2 className="font-display text-base font-bold text-primary">Authentication header</h2>
          <p className="text-xs text-muted-foreground">All REST calls expect a bearer token.</p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-primary p-4 font-mono text-xs leading-relaxed text-white">
{`curl https://${typeof window !== "undefined" ? window.location.host : "api.travsify.com"}/api/v1/health \\
  -H "Authorization: Bearer ${approved && live ? live : sandbox || "tsk_sandbox_…"}"`}
          </pre>
        </section>
      </div>
    </PartnerShell>
  );
}

function KeyCard({ tone, icon, title, desc, value, masked, shown, onToggle, onCopy }: {
  tone: "live" | "sandbox"; icon: React.ReactNode; title: string; desc: string;
  value: string; masked: string; shown: boolean; onToggle: () => void; onCopy: () => void;
}) {
  const isLive = tone === "live";
  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isLive ? "bg-gradient-to-br from-accent to-orange-500 text-white" : "bg-accent/10 text-accent"}`}>{icon}</div>
        <div className="flex-1">
          <h2 className="font-display text-base font-bold text-primary">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-xs text-foreground">
        <span className="truncate">{value ? (shown ? value : masked) : "—"}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onToggle} disabled={!value} aria-label={shown ? "Hide key" : "Show key"} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-50">
            {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button onClick={onCopy} disabled={!value} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-50">
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveLockedCard() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-base font-bold text-primary">Live API key</h2>
          <p className="text-xs text-muted-foreground">Unlocks automatically the moment your KYC is approved.</p>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-border bg-white px-3 py-2.5 font-mono text-xs text-muted-foreground">
        tsk_live_••••••••••••••••••••••••
      </div>
      <Link to="/pending-review" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
        <KeyRound className="h-3 w-3" /> Check application status
      </Link>
    </div>
  );
}
