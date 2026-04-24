import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: SignInPage,
  head: () => ({
    meta: [
      { title: "Sign in — Travsify NDC" },
      { name: "description", content: "Sign in to your Travsify dashboard to manage API keys, view usage and ship faster." },
    ],
  }),
});

function SignInPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: search.redirect || "/dashboard" });
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={<>Sign in to your <span className="text-gradient-accent">Travsify dashboard</span></>}
      subtitle="Manage API keys, monitor usage, and ship new travel products faster."
      footer={
        <>
          New to Travsify?{" "}
          <Link to="/get-api-access" className="font-semibold text-accent story-link">
            Get API access
          </Link>
        </>
      }
    >
      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Work email"
          icon={<Mail className="h-4 w-4" />}
          input={
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none"
              placeholder="you@company.com"
            />
          }
          error={errors.email}
        />
        <Field
          label="Password"
          icon={<Lock className="h-4 w-4" />}
          input={
            <input
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none"
              placeholder="••••••••"
            />
          }
          right={
            <button type="button" onClick={() => setShowPwd((s) => !s)} className="text-muted-foreground hover:text-foreground">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={errors.password}
        />
        <div className="flex justify-end">
          <Link to="/reset-password" className="text-xs font-medium text-accent story-link">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-glow group inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          style={{ boxShadow: "var(--shadow-accent)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

function Field({
  label,
  icon,
  input,
  right,
  error,
}: {
  label: string;
  icon: React.ReactNode;
  input: React.ReactNode;
  right?: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div
        className={`flex items-center gap-3 rounded-md border bg-white px-3 py-2.5 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 ${
          error ? "border-destructive" : "border-border"
        }`}
      >
        <span className="text-muted-foreground">{icon}</span>
        {input}
        {right}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A11 11 0 001 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
