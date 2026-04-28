import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Copy, Eye, EyeOff, Sparkles, ShieldCheck, KeyRound, Lock,
  RefreshCw, Ban, AlertTriangle, Loader2, History,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { toast } from "sonner";
import {
  listMyApiKeys,
  regenerateApiKey,
  revokeMyApiKey,
} from "@/server/partner-keys.functions";

export const Route = createFileRoute("/_authenticated/api-keys")({
  component: ApiKeysPage,
  head: () => ({ meta: [{ title: "API keys — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

type KeyRow = {
  id: string;
  key_prefix: string;
  environment: string;
  name: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  rate_limit_per_minute: number;
  created_at: string;
};

function ApiKeysPage() {
  const { profile, refresh: refreshProfile } = useProfile();
  const [showLive, setShowLive] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [justRevealed, setJustRevealed] = useState<{ env: string; value: string } | null>(null);

  const status = profile?.kyc_status ?? "draft";
  const approved = status === "approved";
  const sandbox = profile?.sandbox_api_key ?? "";
  const live = profile?.live_api_key ?? "";

  async function loadKeys() {
    setLoadingKeys(true);
    try {
      const res = await listMyApiKeys();
      setKeys(res.keys as KeyRow[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingKeys(false);
    }
  }

  useEffect(() => { loadKeys(); }, []);

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

  async function handleRegenerate(env: "sandbox" | "live") {
    const hasExisting = env === "sandbox" ? !!sandbox : !!live;
    const confirmMsg = hasExisting
      ? `Rotate your ${env} key?\n\nThe current key will stop working IMMEDIATELY. Any integration using it must be updated to the new key.`
      : `Generate a new ${env} key?`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(`regen-${env}`);
    try {
      const res = await regenerateApiKey({ data: { environment: env } });
      toast.success(`${env === "live" ? "Live" : "Sandbox"} key generated`);
      setJustRevealed({ env, value: res.key });
      if (env === "sandbox") setShowSandbox(true);
      else setShowLive(true);
      await Promise.all([refreshProfile(), loadKeys()]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke(keyId: string, env: string) {
    if (!window.confirm(`Revoke this ${env} key?\n\nIt will stop working immediately and cannot be restored. You can generate a new one afterwards.`)) return;
    setBusy(`revoke-${keyId}`);
    try {
      await revokeMyApiKey({ data: { key_id: keyId } });
      toast.success("Key revoked");
      await Promise.all([refreshProfile(), loadKeys()]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const activeSandbox = keys.find((k) => k.environment === "sandbox" && !k.revoked_at);
  const activeLive = keys.find((k) => k.environment === "live" && !k.revoked_at);
  const revokedKeys = keys.filter((k) => !!k.revoked_at);

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

        {(sandbox && !sandbox.startsWith("tsk_")) || (live && !live.startsWith("tsk_")) ? (
          <div className="mt-6 rounded-2xl border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <div className="font-display text-sm font-bold text-destructive">Legacy API keys detected</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  One or more of your keys use an outdated format. Legacy keys were disabled on April 28, 2026. 
                  Please **Rotate** your keys below to restore API access.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {justRevealed && (
          <div className="mt-6 rounded-2xl border-2 border-accent bg-accent/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm font-bold text-primary">
                  Your new {justRevealed.env} key — copy it now
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  This is the only time the full key is highlighted. You can re-view it on this page until it's rotated again.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-white p-2 font-mono text-xs">
                  <span className="flex-1 truncate">{justRevealed.value}</span>
                  <button
                    onClick={() => copy("Key", justRevealed.value)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                  <button
                    onClick={() => setJustRevealed(null)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
            createdAt={activeSandbox?.created_at ?? null}
            lastUsed={activeSandbox?.last_used_at ?? null}
            onRegenerate={() => handleRegenerate("sandbox")}
            onRevoke={activeSandbox ? () => handleRevoke(activeSandbox.id, "sandbox") : undefined}
            busy={busy === "regen-sandbox" || busy === `revoke-${activeSandbox?.id}`}
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
              createdAt={activeLive?.created_at ?? null}
              lastUsed={activeLive?.last_used_at ?? null}
              onRegenerate={() => handleRegenerate("live")}
              onRevoke={activeLive ? () => handleRevoke(activeLive.id, "live") : undefined}
              busy={busy === "regen-live" || busy === `revoke-${activeLive?.id}`}
            />
          ) : (
            <LiveLockedCard />
          )}
        </div>

        {/* Revoked / historical keys */}
        <section className="mt-8 rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-bold text-primary">Revoked keys</h2>
          </div>
          <p className="text-xs text-muted-foreground">Audit trail of keys that have been rotated or revoked. These no longer authenticate.</p>
          <div className="mt-4">
            {loadingKeys ? (
              <div className="flex h-20 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-accent" /></div>
            ) : revokedKeys.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
                No revoked keys yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {revokedKeys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex items-center gap-2">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-primary truncate">{k.key_prefix}…</div>
                        <div className="text-[11px] text-muted-foreground">
                          {k.environment} · created {new Date(k.created_at).toLocaleDateString()} · revoked {k.revoked_at ? new Date(k.revoked_at).toLocaleDateString() : "—"}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">Revoked</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
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

function KeyCard({
  tone, icon, title, desc, value, masked, shown, onToggle, onCopy,
  createdAt, lastUsed, onRegenerate, onRevoke, busy,
}: {
  tone: "live" | "sandbox"; icon: React.ReactNode; title: string; desc: string;
  value: string; masked: string; shown: boolean; onToggle: () => void; onCopy: () => void;
  createdAt: string | null; lastUsed: string | null;
  onRegenerate: () => void; onRevoke?: () => void; busy: boolean;
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
        <span className="truncate">{value ? (shown ? value : masked) : "Not generated yet"}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onToggle} disabled={!value} aria-label={shown ? "Hide key" : "Show key"} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-50">
            {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button onClick={onCopy} disabled={!value} className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-50">
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>

      {(createdAt || lastUsed) && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          {createdAt && <span>Created {new Date(createdAt).toLocaleDateString()}</span>}
          {lastUsed && <span>· Last used {new Date(lastUsed).toLocaleString()}</span>}
          {!lastUsed && createdAt && <span>· Never used</span>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          onClick={onRegenerate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {value ? "Rotate key" : "Generate key"}
        </button>
        {onRevoke && (
          <button
            onClick={onRevoke}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-white px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Ban className="h-3 w-3" /> Revoke
          </button>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {isLive ? "Production" : "Test mode"}
        </span>
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
