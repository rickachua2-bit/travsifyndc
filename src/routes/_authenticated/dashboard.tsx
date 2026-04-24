import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, ArrowRight, LogOut, Key, Code2, Activity, BookOpen, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/hooks/useAuth";
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

function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; company: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, company").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
    });
  }, [user]);

  const sandboxKey = `tx_sk_sandbox_${user?.id?.slice(0, 8) ?? "demo1234"}_xxx`;
  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            <Link to="/docs" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Docs</Link>
            <Link to="/demo" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Demo</Link>
            <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="animate-fade-in-up">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Welcome back</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            Hello {firstName} <span className="text-gradient-accent">👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-base text-muted-foreground">
            Your Travsify sandbox is live. Make your first call in under a minute.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Key className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-lg font-bold text-primary">Sandbox API key</h2>
                <p className="text-xs text-muted-foreground">Safe for testing. Never charged. Never bills the traveler.</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 font-mono text-xs text-foreground">
              <span className="truncate">{sandboxKey}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(sandboxKey); toast.success("Copied"); }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/demo" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground btn-glow" style={{ boxShadow: "var(--shadow-accent)" }}>
                Try live demo <ArrowRight className="h-3 w-3" />
              </Link>
              <Link to="/docs" className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
                Read docs
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Activity className="h-5 w-5" /></div>
              <div>
                <h2 className="font-display text-lg font-bold text-primary">Application status</h2>
                <p className="text-xs text-muted-foreground">Live access review</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Sandbox" status="Active" tone="success" />
              <Row label="Live access" status="Under review" tone="muted" />
              <Row label="Webhooks" status="Not configured" tone="muted" />
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-primary">Next steps</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Code2, title: "Make your first call", desc: "Search a flight in 5 lines using the SDK.", to: "/developers" as const },
              { icon: BookOpen, title: "Read the docs", desc: "Endpoints, webhooks and idempotency.", to: "/docs" as const },
              { icon: CheckCircle2, title: "Book a strategy call", desc: "Get a custom rollout plan.", to: "/contact" as const },
            ].map((s) => (
              <Link key={s.title} to={s.to} className="hover-lift rounded-xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-deep text-white"><s.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-base font-bold text-primary">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">Go <ArrowRight className="h-3 w-3" /></div>
              </Link>
            ))}
          </div>
        </section>
      </main>
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
