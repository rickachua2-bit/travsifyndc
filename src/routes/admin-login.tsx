import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff, Shield, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/landing/Logo";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export const Route = createFileRoute("/admin-login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AdminLoginPage,
  head: () => ({
    meta: [
      { title: "Super Admin Login — Travsify" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Restricted access. Travsify staff only." },
    ],
  }),
});

async function userIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

function getSafeAdminRedirect(redirect?: string) {
  if (redirect?.startsWith("/admin") && !redirect.startsWith("/admin-login")) {
    return redirect;
  }
  return "/admin";
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingAdminSession, setExistingAdminSession] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Keep /admin-login reachable. Only mark an existing admin session;
  // never auto-redirect from this page because that can create a bounce loop.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        const ok = await userIsAdmin(data.session.user.id);
        if (cancelled) return;
        if (ok) {
          setExistingAdminSession(true);
        } else {
          await supabase.auth.signOut();
          if (cancelled) return;
          setExistingAdminSession(false);
        }
      } else {
        setExistingAdminSession(false);
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof typeof errors;
        fieldErrs[k] = i.message;
      });
      setErrors(fieldErrs);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message || "Sign in failed");
      return;
    }
    const ok = await userIsAdmin(data.user.id);
    if (!ok) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account is not authorized for admin access.");
      return;
    }
    setLoading(false);
    toast.success("Welcome, admin");
    navigate({ to: getSafeAdminRedirect(search.redirect), replace: true });
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(1200px 600px at 10% -10%, oklch(0.32 0.12 280 / 0.55), transparent 60%), radial-gradient(900px 500px at 100% 0%, oklch(0.28 0.14 30 / 0.45), transparent 55%), linear-gradient(180deg, oklch(0.14 0.04 260) 0%, oklch(0.10 0.03 260) 100%)",
      }}
    >
      {/* Grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
        </Link>
        <Link
          to="/signin"
          className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white"
        >
          Partner sign in →
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 pb-16 pt-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          <Shield className="h-3 w-3" /> Restricted access
        </span>
        <h1 className="mt-5 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Super Admin Console
        </h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Sign in with your Travsify staff credentials. All access is logged.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 w-full space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
        >
          <Field
            label="Admin email"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email}
          >
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@travsify.com"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </Field>

          <Field
            label="Password"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password}
            trailing={
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-white/50 hover:text-white"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          >
            <input
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Enter console
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Not an admin?{" "}
          <Link to="/signin" className="font-semibold text-white/70 hover:text-white">
            Use the partner sign-in page
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

function Field({
  label,
  icon,
  trailing,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {label}
      </span>
      <span
        className={`flex items-center gap-2.5 rounded-md border bg-black/20 px-3 py-2.5 transition focus-within:border-accent ${
          error ? "border-destructive/60" : "border-white/10"
        }`}
      >
        <span className="text-white/40">{icon}</span>
        {children}
        {trailing}
      </span>
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}
