import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Activity, BookOpen, CheckCircle2, ShieldCheck, Sparkles,
  Webhook, Zap, AlertCircle, Settings, CreditCard, Users, Inbox, KeyRound, Wallet as WalletIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { PartnerShell } from "@/components/partner/PartnerShell";

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
  const { user } = useAuth();
  const { profile } = useProfile();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [walletTotal, setWalletTotal] = useState<{ usd: number; ngn: number }>({ usd: 0, ngn: 0 });
  const [loading, setLoading] = useState(true);

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const status = profile?.kyc_status ?? "draft";
  const approved = status === "approved";

  useEffect(() => {
    if (!user) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from("api_logs").select("created_at,status_code,vertical").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("bookings").select("id,reference,vertical,provider,customer_name,total_amount,currency,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("wallets").select("currency,balance").eq("user_id", user.id),
    ]).then(([l, b, w]) => {
      setLogs((l.data ?? []) as LogRow[]);
      setBookings((b.data ?? []) as BookingRow[]);
      const wallets = (w.data ?? []) as { currency: string; balance: number }[];
      setWalletTotal({
        usd: Number(wallets.find((x) => x.currency === "USD")?.balance ?? 0),
        ngn: Number(wallets.find((x) => x.currency === "NGN")?.balance ?? 0),
      });
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

  return (
    <PartnerShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="animate-fade-in-up flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill status={status} />
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-primary md:text-4xl">
              Welcome, {firstName} <span className="text-gradient-accent">👋</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {profile?.legal_name ?? profile?.company ?? "Your account"} · {approved
                ? "Live + Sandbox active. You keep 100% of your margin."
                : "Sandbox is unlocked while we review. Live keys activate on approval."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/api-keys" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
              <KeyRound className="h-3.5 w-3.5" /> API keys
            </Link>
            <Link to="/docs" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
              <BookOpen className="h-3.5 w-3.5" /> Read the docs
            </Link>
          </div>
        </div>

        {!approved && <AwaitingApprovalBanner status={status} reason={profile?.rejection_reason ?? null} />}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Zap className="h-4 w-4" />} label="API calls (7d)" value={stats.calls.toLocaleString()} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Bookings (all-time)" value={bookings.length.toLocaleString()} />
          <Stat icon={<CreditCard className="h-4 w-4" />} label="GMV (confirmed)" value={`$${stats.gmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <Stat icon={<WalletIcon className="h-4 w-4" />} label="Wallet" value={`$${walletTotal.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} · ₦${walletTotal.ngn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
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
              <EmptyState icon={<Inbox className="h-5 w-5" />} title="No bookings yet" desc="Once you create your first booking via the API or in-app, it will appear here." />
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
            <p className="text-xs text-muted-foreground">Get your first booking flowing</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ChecklistTile to="/api-keys" icon={KeyRound} title="Grab your sandbox key" desc="Two lines of code, full feature parity." />
              <ChecklistTile to="/wallet" icon={WalletIcon} title="Fund your wallet" desc="Top-up USD or NGN to enable bookings." />
              <ChecklistTile to="/dashboard-book" icon={Sparkles} title="Make your first booking" desc="Search inventory and book in-app." />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Activity className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-base font-bold text-primary">Account status</h2>
                <p className="text-xs text-muted-foreground">{approved ? "Everything looks good" : "Sandbox active while we review"}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <StatusRow label="Sandbox" status={profile?.sandbox_api_key ? "Active" : "Pending"} tone={profile?.sandbox_api_key ? "success" : "muted"} />
              <StatusRow label="Live access" status={approved && profile?.live_api_key ? "Active" : status === "rejected" ? "Rejected" : "Awaiting approval"} tone={approved && profile?.live_api_key ? "success" : status === "rejected" ? "destructive" : "muted"} />
              <StatusRow label="Webhooks" status="Not configured" tone="muted" />
              <StatusRow label="Rate limit" status="120 req/min" tone="success" />
              <StatusRow label="Error rate (7d)" status={`${stats.errorRate.toFixed(2)}%`} tone={stats.errorRate < 1 ? "success" : "muted"} />
            </div>
            <Link to="/contact" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              <Settings className="h-3 w-3" /> Request rate-limit increase
            </Link>
          </Card>
        </div>
      </div>
    </PartnerShell>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" /> KYC approved · Live + Sandbox active
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
        <AlertCircle className="h-3 w-3" /> Application not approved
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
      <ShieldCheck className="h-3 w-3" /> Sandbox mode · awaiting approval
    </div>
  );
}

function AwaitingApprovalBanner({ status, reason }: { status: string; reason: string | null }) {
  if (status === "rejected") {
    return (
      <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-destructive" />
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-primary">Application not approved</p>
            {reason && <p className="mt-1 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Reviewer note:</span> {reason}</p>}
            <Link to="/kyc" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
              Update & resubmit <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-accent" />
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-primary">You're in sandbox mode while we review your KYC</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build, test, and integrate the full API with your sandbox key. Live keys activate automatically the moment you're approved (typical review: 24–72h).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/api-keys" className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
              <KeyRound className="h-3 w-3" /> Get sandbox key
            </Link>
            <Link to="/pending-review" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
              View application status
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistTile({ to, icon: Icon, title, desc }: { to: "/api-keys" | "/wallet" | "/dashboard-book" | "/docs" | "/contact"; icon: typeof KeyRound; title: string; desc: string }) {
  return (
    <Link to={to} className="hover-lift rounded-xl border border-border bg-surface p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep text-white"><Icon className="h-5 w-5" /></div>
      <h3 className="mt-3 font-display text-sm font-bold text-primary">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">Go <ArrowRight className="h-3 w-3" /></div>
    </Link>
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
    processing: "bg-accent/15 text-accent",
    cancelled: "bg-muted text-muted-foreground",
    failed: "bg-destructive/15 text-destructive",
    refunded: "bg-blue-500/15 text-blue-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

function StatusRow({ label, status, tone }: { label: string; status: string; tone: "success" | "muted" | "destructive" }) {
  const cls = tone === "success" ? "bg-success/15 text-success" : tone === "destructive" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
      <span className="text-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{status}</span>
    </div>
  );
}
