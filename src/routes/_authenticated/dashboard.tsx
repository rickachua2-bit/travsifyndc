import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Copy, ArrowRight, LogOut, Code2, Activity, BookOpen, CheckCircle2, ShieldCheck, Sparkles,
  Plane, Building2, MapPin, Globe2, Shield, Car, TrendingUp, TrendingDown, Eye, EyeOff,
  Webhook, Zap, AlertCircle, Settings, CreditCard, Users
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useIsAdmin } from "@/hooks/useProfile";
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

// Deterministic mock data — same values every render for a clean UI
const MOCK_USAGE_DAYS = [
  { d: "Mon", calls: 1240, bookings: 12 },
  { d: "Tue", calls: 1820, bookings: 18 },
  { d: "Wed", calls: 2410, bookings: 24 },
  { d: "Thu", calls: 1990, bookings: 21 },
  { d: "Fri", calls: 3120, bookings: 34 },
  { d: "Sat", calls: 2680, bookings: 29 },
  { d: "Sun", calls: 2050, bookings: 22 },
];
const MAX_CALLS = Math.max(...MOCK_USAGE_DAYS.map((d) => d.calls));

const MOCK_BOOKINGS = [
  { id: "BK-7H8K2L", type: "Flight", route: "LOS → JNB", traveler: "A. Okafor", amount: "$842.00", status: "confirmed", time: "12 min ago", Icon: Plane },
  { id: "BK-9P4M3N", type: "Hotel", route: "Radisson Blu Lagos · 3 nights", traveler: "K. Mensah", amount: "$614.00", status: "confirmed", time: "47 min ago", Icon: Building2 },
  { id: "BK-2R6T8V", type: "Tour", route: "Cape Town City Tour", traveler: "T. Adebayo", amount: "$129.00", status: "pending", time: "2 h ago", Icon: MapPin },
  { id: "BK-5W1X9Y", type: "e-Visa", route: "Kenya · Single Entry", traveler: "S. Kamara", amount: "$74.00", status: "processing", time: "4 h ago", Icon: Globe2 },
  { id: "BK-3A8B7C", type: "Insurance", route: "Schengen · 21 days", traveler: "M. Diallo", amount: "$58.00", status: "confirmed", time: "6 h ago", Icon: Shield },
  { id: "BK-6D2F4G", type: "Transfer", route: "MUR Airport → Hotel", traveler: "R. Patel", amount: "$48.00", status: "confirmed", time: "9 h ago", Icon: Car },
];

const MOCK_VERTICAL_SPLIT = [
  { name: "Flights", pct: 42, color: "bg-accent" },
  { name: "Hotels", pct: 28, color: "bg-primary" },
  { name: "Tours", pct: 12, color: "bg-success" },
  { name: "e-Visas", pct: 9, color: "bg-blue-500" },
  { name: "Insurance", pct: 6, color: "bg-purple-500" },
  { name: "Transfers", pct: 3, color: "bg-pink-500" },
];

function DashboardPage() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [showLive, setShowLive] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const sandbox = profile?.sandbox_api_key ?? "";
  const live = profile?.live_api_key ?? "";

  const totals = useMemo(() => {
    const calls = MOCK_USAGE_DAYS.reduce((s, d) => s + d.calls, 0);
    const bookings = MOCK_USAGE_DAYS.reduce((s, d) => s + d.bookings, 0);
    return { calls, bookings };
  }, []);

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
        {/* Hero */}
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
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            <BookOpen className="h-4 w-4" /> Read the docs
          </Link>
        </div>

        {/* Stat cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Zap className="h-4 w-4" />} label="API calls (7d)" value={totals.calls.toLocaleString()} delta="+18.4%" up />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Bookings (7d)" value={totals.bookings.toLocaleString()} delta="+12.1%" up />
          <Stat icon={<CreditCard className="h-4 w-4" />} label="GMV (7d)" value="$48,210" delta="+9.6%" up />
          <Stat icon={<AlertCircle className="h-4 w-4" />} label="Error rate" value="0.42%" delta="−0.08%" up={false} good />
        </div>

        {/* API keys */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <KeyCard
            tone="live"
            icon={<Sparkles className="h-5 w-5" />}
            title="Live API key"
            desc="Production traffic. Real bookings. Real money. Keep it secret."
            value={live}
            shown={showLive}
            onToggle={() => setShowLive((s) => !s)}
            onCopy={() => copy("Live key", live)}
            masked={masked(live)}
          />
          <KeyCard
            tone="sandbox"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Sandbox API key"
            desc="Safe for testing. Never charged. Never bills the traveler."
            value={sandbox}
            shown={showSandbox}
            onToggle={() => setShowSandbox((s) => !s)}
            onCopy={() => copy("Sandbox key", sandbox)}
            masked={masked(sandbox)}
          />
        </div>

        {/* Usage chart + vertical split */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-primary">API usage · last 7 days</h2>
                <p className="text-xs text-muted-foreground">Calls per day across all endpoints</p>
              </div>
              <div className="hidden gap-3 text-xs text-muted-foreground sm:flex">
                <Legend color="bg-accent" label="Calls" />
                <Legend color="bg-primary" label="Bookings" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-7 items-end gap-3 h-44">
              {MOCK_USAGE_DAYS.map((d) => {
                const h = Math.round((d.calls / MAX_CALLS) * 100);
                const hb = Math.round((d.bookings / 34) * 100 * 0.6);
                return (
                  <div key={d.d} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div className="w-3 rounded-t bg-accent transition-all hover:opacity-80" style={{ height: `${h}%` }} title={`${d.calls} calls`} />
                      <div className="w-3 rounded-t bg-primary transition-all hover:opacity-80" style={{ height: `${hb}%` }} title={`${d.bookings} bookings`} />
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{d.d}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">Demo data · real metrics will appear here once you start sending live traffic.</p>
          </Card>

          <Card>
            <h2 className="font-display text-base font-bold text-primary">Bookings by vertical</h2>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
            <div className="mt-5 space-y-3">
              {MOCK_VERTICAL_SPLIT.map((v) => (
                <div key={v.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{v.name}</span>
                    <span className="font-semibold text-muted-foreground">{v.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${v.color} transition-all`} style={{ width: `${v.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent bookings */}
        <div className="mt-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-primary">Recent bookings</h2>
                <p className="text-xs text-muted-foreground">Latest transactions across your integration</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Demo data</span>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <Th>Booking</Th>
                    <Th>Type</Th>
                    <Th>Detail</Th>
                    <Th>Traveler</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                    <Th>When</Th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_BOOKINGS.map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-surface/50">
                      <Td><span className="font-mono text-xs text-foreground">{b.id}</span></Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <b.Icon className="h-3.5 w-3.5 text-accent" /> {b.type}
                        </span>
                      </Td>
                      <Td><span className="text-foreground">{b.route}</span></Td>
                      <Td><span className="text-muted-foreground">{b.traveler}</span></Td>
                      <Td><span className="font-semibold text-foreground">{b.amount}</span></Td>
                      <Td><BookingStatus status={b.status} /></Td>
                      <Td><span className="text-xs text-muted-foreground">{b.time}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Onboarding + Account status */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card>
            <h2 className="font-display text-base font-bold text-primary">Onboarding checklist</h2>
            <p className="text-xs text-muted-foreground">Get your first live booking flowing</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Code2, title: "Make your first call", desc: "Search a flight in 5 lines.", to: "/developers" as const },
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
              <StatusRow label="Live access" status="Active" tone="success" />
              <StatusRow label="Sandbox" status="Active" tone="success" />
              <StatusRow label="Webhooks" status="Not configured" tone="muted" />
              <StatusRow label="Rate limit" status="120 rps" tone="success" />
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
  return (
    <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      {children}
    </section>
  );
}

function Stat({ icon, label, value, delta, up, good }: { icon: React.ReactNode; label: string; value: string; delta: string; up: boolean; good?: boolean }) {
  const positive = good !== undefined ? good : up;
  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? "text-success" : "text-destructive"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </span>
      </div>
      <div className="mt-4 font-display text-2xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function KeyCard({
  tone, icon, title, desc, value, masked, shown, onToggle, onCopy,
}: {
  tone: "live" | "sandbox"; icon: React.ReactNode; title: string; desc: string;
  value: string; masked: string; shown: boolean; onToggle: () => void; onCopy: () => void;
}) {
  const isLive = tone === "live";
  return (
    <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isLive ? "bg-gradient-to-br from-accent to-orange-500 text-white" : "bg-accent/10 text-accent"}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-base font-bold text-primary">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-xs text-foreground">
        <span className="truncate">{value ? (shown ? value : masked) : "—"}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggle}
            disabled={!value}
            aria-label={shown ? "Hide key" : "Show key"}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button
            onClick={onCopy}
            disabled={!value}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} /> {label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-left font-semibold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5">{children}</td>;
}

function BookingStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-success/15 text-success",
    pending: "bg-accent/15 text-accent",
    processing: "bg-blue-500/15 text-blue-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function StatusRow({ label, status, tone }: { label: string; status: string; tone: "success" | "muted" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
      <span className="text-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone === "success" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    </div>
  );
}
