import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, KeyRound, Ban, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { adminListApiKeys, adminRevokeApiKey, adminUpdateApiKeyRateLimit } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({
  component: AdminApiKeys,
  head: () => ({ meta: [{ title: "API keys — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Key = {
  id: string;
  user_id: string;
  key_prefix: string;
  environment: string;
  name: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  rate_limit_per_minute: number;
  created_at: string;
  profile: { full_name: string | null; legal_name: string | null; company: string | null } | null;
};

const ENVS = ["all", "sandbox", "live"] as const;

function AdminApiKeys() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState<(typeof ENVS)[number]>("all");
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const res = await adminListApiKeys({ data: { environment: env === "all" ? undefined : env, q: q || undefined } });
      setKeys(res.keys as Key[]);
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [env]);

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Partner traffic using it will fail immediately.")) return;
    try { await adminRevokeApiKey({ data: { key_id: id } }); toast.success("Key revoked"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function setLimit(id: string, current: number) {
    const v = window.prompt("New rate limit (requests per minute)", String(current));
    if (!v) return;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1) return toast.error("Invalid value");
    try { await adminUpdateApiKeyRateLimit({ data: { key_id: id, rate_limit_per_minute: n } }); toast.success("Rate limit updated"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Developers</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">API keys</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every issued key, with usage and rate-limit overrides.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-lg border border-border bg-white p-1">
          {ENVS.map((e) => (
            <button key={e} onClick={() => setEnv(e)} className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase ${env === e ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{e}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} placeholder="Key prefix, partner, name…" className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm" />
        </div>
        <button onClick={refresh} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Search</button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No API keys.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>Key</Th><Th>Partner</Th><Th>Env</Th><Th>RPM</Th><Th>Last used</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                  <Td>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-mono text-xs font-semibold">{k.key_prefix}…</div>
                        {k.name && <div className="text-[11px] text-muted-foreground">{k.name}</div>}
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs">{k.profile?.legal_name ?? k.profile?.company ?? k.user_id.slice(0, 8)}</Td>
                  <Td><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${k.environment === "live" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>{k.environment}</span></Td>
                  <Td className="text-xs font-mono">{k.rate_limit_per_minute}</Td>
                  <Td className="text-xs text-muted-foreground whitespace-nowrap">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}</Td>
                  <Td>
                    {k.revoked_at ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">Revoked</span>
                    ) : !k.key_prefix.startsWith("tsk_") ? (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">Legacy</span>
                    ) : (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success">Active</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => setLimit(k.id, k.rate_limit_per_minute)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-accent hover:text-accent"><Settings2 className="h-3 w-3" /> RPM</button>
                      {!k.revoked_at && (
                        <button onClick={() => revoke(k.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Ban className="h-3 w-3" /> Revoke</button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-foreground ${className}`}>{children}</td>;
}
