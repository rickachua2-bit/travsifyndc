import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Copy, ArrowRight, LogOut, Code2, Activity, BookOpen, CheckCircle2, ShieldCheck, Sparkles,
  Eye, EyeOff, Webhook, Zap, AlertCircle, Settings, CreditCard, Users, Inbox
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useIsAdmin } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Travsify NDC" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type LogRow = { created_at: string; status_code: number; vertical: string | null };
type BookingRow = {
  id: string; reference: string; vertical: string; provider: string;
  customer_name: string | null; total_amount: number; currency: string;
  status: string; created_at: string;
};

function DashboardPage() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [showLive, setShowLive] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const sandbox = profile?.sandbox_api_key ?? "";
  const live = profile?.live_api_key ?? "";

  useEffect(() => {
    if (!user) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from("api_logs").select("created_at,status_code,vertical").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("bookings").select("id,reference,vertical,provider,customer_name,total_amount,currency,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]).then(([l, b]) => {
      setLogs((l.data ?? []) as LogRow[]);
      setBookings((b.data ?? []) as BookingRow[]);
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo(() => {
    const calls = logs.length;
    const errors = logs.filter((l) => l.status_code >= 400).length;
    const errorRate = calls === 0 ? 0 : (errors / calls) * 100;
    const gmv = bookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const verticalSplit = bookings.reduce<Record<string, number>>((acc, b) => {
      acc[b.vertical] = (acc[b.vertical] || 0) + 1;
      return acc;
    }, {});
    const totalBk = bookings.length || 1;
    const splitArr = Object.entries(verticalSplit).map(([name, count]) => ({
      name, pct: Math.round((count / totalBk) * 100),
    })).sort((a, b) => b.pct - a.pct);

    // 7-day series
    const days: { d: string; calls: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      days.push({ d: label, calls: logs.filter((l) => l.created_at.slice(0, 10) === key).length });
    }
    const max = Math.max(1, ...days.map((d) => d.calls));
    return { calls, errors, errorRate, gmv, splitArr, days, max };
  }, [logs, bookings]);

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

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
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin" className="hidden rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/20 sm:inline-block">
                Admin
              </Link>
            )}
            <Link to="/docs" className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-block">Docs</Link>
            <Link to="/demo" className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-block">Demo</Link>
            <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="animate-fade-in-up flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3 w-3" /> KYC approved · Free for life
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-primary md:text-4xl">
              Welcome, {firstName} <span className="text-gradient-accent">👋</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {profile?.legal_name ?? profile?.company} is live on Travsify. No fees. No commission. You keep 100% of your margin.
            </p>
          </div>
          <Link to="/docs" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95">
            <BookOpen className="h-4 w-4" /> Read the docs
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Zap className="h-4 w-4" />} label="API calls (7d)" value={stats.calls.toLocaleString()} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Bookings (all-time)" value={bookings.length.toLocaleString()} />
          <Stat icon={<CreditCard className="h-4 w-4" />} label="GMV (confirmed)" value={`$${stats.gmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <Stat icon={<AlertCircle className="h-4 w-4" />} label="Error rate (7d)" value={`${stats.errorRate.toFixed(2)}%`} />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <KeyCard tone="live" icon={<Sparkles className="h-5 w-5" />} title="Live API key"
            desc="Production traffic. Real bookings. Real money. Keep it secret."
            value={live} shown={showLive} onToggle={() => setShowLive((s) => !s)}
            onCopy={() => copy("Live key", live)} masked={masked(live)} />
          <KeyCard tone="sandbox" icon={<ShieldCheck className="h-5 w-5" />} title="Sandbox API key"
            desc="Safe for testing. Never charged. Never bills the traveler."
            value={sandbox} shown={showSandbox} onToggle={() => setShowSandbox((s) => !s)}
            onCopy={() => copy("Sandbox key", sandbox)} masked={masked(sandbox)} />
        </div>

        {/* Two-line snippet */}
        <div className="mt-8">
          <Card>
            <h2 className="font-display text-base font-bold text-primary">Integrate in two lines</h2>
            <p className="text-xs text-muted-foreground">Drop this into any HTML page. That's the full integration.</p>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-primary p-4 font-mono text-xs leading-relaxed text-white">
{`<script src="${typeof window !== "undefined" ? window.location.origin : ""}/sdk.js"></script>
<script>Travsify.init("${live || "tsk_live_…"}").flights.search({origin:"LOS",destination:"DXB",departure_date:"2026-06-01",adults:1}).then(console.log)</script>`}
            </pre>
            <button
              onClick={() => copy("Snippet", `<script src="${window.location.origin}/sdk.js"></script>\n<script>Travsify.init("${live || "tsk_live_…"}").flights.search({origin:"LOS",destination:"DXB",departure_date:"2026-06-01",adults:1}).then(console.log)</script>`)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:border-accent hover:text-accent"
            >
              <Copy className="h-3 w-3" /> Copy snippet
            </button>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h2 className="font-display text-base font-bold text-primary">API usage · last 7 days</h2>
            <p className="text-xs text-muted-foreground">Calls per day across all endpoints</p>
            {stats.calls === 0 ? (
              <EmptyState icon={<Inbox className="h-5 w-5" />} title="No API calls yet" desc="Make your first request to see live metrics here." />
            ) : (
              <div className="mt-6 grid h-44 grid-cols-7 items-end gap-3">
                {stats.days.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-full w-full items-end justify-center">
                      <div className="w-4 rounded-t bg-accent transition-all hover:opacity-80" style={{ height: `${(d.calls / stats.max) * 100}%` }} title={`${d.calls} calls`} />
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{d.d}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-base font-bold text-primary">Bookings by vertical</h2>
            <p className="text-xs text-muted-foreground">All-time</p>
            {stats.splitArr.length === 0 ? (
              <EmptyState icon={<Inbox className="h-5 w-5" />} title="No bookings yet" desc="Confirmed bookings will appear here." />
            ) : (
              <div className="mt-5 space-y-3">
                {stats.splitArr.map((v) => (
                  <div key={v.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize text-foreground">{v.name}</span>
                      <span className="font-semibold text-muted-foreground">{v.pct}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-accent transition-all" style={{ width: `${v.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <h2 className="font-display text-base font-bold text-primary">Recent bookings</h2>
            <p className="text-xs text-muted-foreground">Latest confirmed transactions</p>
            {loading ? (
              <p className="mt-6 text-xs text-muted-foreground">Loading…</p>
            ) : bookings.length === 0 ? (
              <EmptyState icon={<Inbox className="h-5 w-5" />} title="No bookings yet" desc="Once you create your first booking via the API, it will appear here." />
            ) : (
              <div className="mt-5 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <Th>Reference</Th><Th>Vertical</Th><Th>Provider</Th><Th>Customer</Th><Th>Amount</Th><Th>Status</Th><Th>When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-t border-border hover:bg-surface/50">
                        <Td><span className="font-mono text-xs text-foreground">{b.reference}</span></Td>
                        <Td><span className="capitalize text-foreground">{b.vertical}</span></Td>
                        <Td><span className="text-muted-foreground">{b.provider}</span></Td>
                        <Td><span className="text-muted-foreground">{b.customer_name ?? "—"}</span></Td>
                        <Td><span className="font-semibold text-foreground">{b.currency} {Number(b.total_amount).toFixed(2)}</span></Td>
                        <Td><BookingStatus status={b.status} /></Td>
                        <Td><span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</span></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h2 className="font-display text-base font-bold text-primary">Onboarding checklist</h2>
            <p className="text-xs text-muted-foreground">Get your first live booking flowing</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Code2, title: "Make your first call", desc: "Search a flight in 2 lines.", to: "/developers" as const },
                { icon: Webhook, title: "Wire up webhooks", desc: "Booking & refund events.", to: "/docs" as const },
                { icon: Users, title: "Invite your team", desc: "Coming soon.", to: "/contact" as const },
              ].map((s) => (
                <Link key={s.title} to={s.to} className="hover-lift rounded-xl border border-border bg-surface p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep text-white"><s.icon className="h-5 w-5" /></div>
                  <h3 className="mt-3 font-display text-sm font-bold text-primary">{s.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">Go <ArrowRight className="h-3 w-3" /></div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Activity className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-base font-bold text-primary">Account status</h2>
                <p className="text-xs text-muted-foreground">Everything looks good</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <StatusRow label="Live access" status={live ? "Active" : "Pending"} tone={live ? "success" : "muted"} />
              <StatusRow label="Sandbox" status={sandbox ? "Active" : "Pending"} tone={sandbox ? "success" : "muted"} />
              <StatusRow label="Webhooks" status="Not configured" tone="muted" />
              <StatusRow label="Rate limit" status="120 req/min" tone="success" />
            </div>
            <Link to="/contact" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              <Settings className="h-3 w-3" /> Request rate-limit increase
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>{children}</section>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
      <div className="mt-4 font-display text-2xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
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

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
      <p className="mt-3 font-display text-sm font-bold text-primary">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-2.5 text-left font-semibold">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-3 py-2.5">{children}</td>; }

function BookingStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-success/15 text-success",
    pending: "bg-accent/15 text-accent",
    cancelled: "bg-muted text-muted-foreground",
    failed: "bg-destructive/15 text-destructive",
    refunded: "bg-blue-500/15 text-blue-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

function StatusRow({ label, status, tone }: { label: string; status: string; tone: "success" | "muted" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
      <span className="text-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone === "success" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{status}</span>
    </div>
  );
}
