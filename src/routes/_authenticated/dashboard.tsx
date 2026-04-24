import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, ArrowRight, LogOut, Key, Code2, Activity, BookOpen, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useProfile";
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

function DashboardPage() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const sandbox = profile?.sandbox_api_key ?? "";
  const live = profile?.live_api_key ?? "";

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin" className="hidden text-sm font-semibold text-accent hover:underline sm:inline">Admin</Link>
            )}
            <Link to="/docs" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Docs</Link>
            <Link to="/demo" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Demo</Link>
            <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" /> KYC approved — full access
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            Welcome, {firstName} <span className="text-gradient-accent">👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-base text-muted-foreground">
            {profile?.legal_name ?? profile?.company} is live on Travsify. Go ship something travelers love.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <KeyCard
            tone="live"
            icon={<Sparkles className="h-5 w-5" />}
            title="Live API key"
            desc="Production traffic. Real bookings. Real money. Keep it secret."
            value={live}
            onCopy={() => copy("Live key", live)}
          />
          <KeyCard
            tone="sandbox"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Sandbox API key"
            desc="Safe for testing. Never charged. Never bills the traveler."
            value={sandbox}
            onCopy={() => copy("Sandbox key", sandbox)}
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-lg font-bold text-primary">Onboarding checklist</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Code2, title: "Make your first call", desc: "Search a flight in 5 lines.", to: "/developers" as const },
                { icon: BookOpen, title: "Wire up webhooks", desc: "Booking & refund events.", to: "/docs" as const },
                { icon: CheckCircle2, title: "Book a strategy call", desc: "Custom rollout plan.", to: "/contact" as const },
              ].map((s) => (
                <Link key={s.title} to={s.to} className="hover-lift rounded-xl border border-border bg-surface p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep text-white"><s.icon className="h-5 w-5" /></div>
                  <h3 className="mt-4 font-display text-base font-bold text-primary">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">Go <ArrowRight className="h-3 w-3" /></div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Activity className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-lg font-bold text-primary">Account status</h2>
                <p className="text-xs text-muted-foreground">Everything looks good</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Live access" status="Active" tone="success" />
              <Row label="Sandbox" status="Active" tone="success" />
              <Row label="Webhooks" status="Not configured" tone="muted" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function KeyCard({ tone, icon, title, desc, value, onCopy }: { tone: "live" | "sandbox"; icon: React.ReactNode; title: string; desc: string; value: string; onCopy: () => void }) {
  const isLive = tone === "live";
  return (
    <div className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isLive ? "bg-gradient-to-br from-accent to-orange-500 text-white" : "bg-accent/10 text-accent"}`}>
          {icon}
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-primary">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 font-mono text-xs text-foreground">
        <span className="truncate">{value || "—"}</span>
        <button
          onClick={onCopy}
          disabled={!value}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
    </div>
  );
}

function Row({ label, status, tone }: { label: string; status: string; tone: "success" | "muted" }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
      <span className="text-foreground">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone === "success" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    </div>
  );
}
