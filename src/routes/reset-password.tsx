import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, Lock, Mail, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const pwdSchema = z.string().min(8, "At least 8 characters").max(72);

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — Travsify NDC" },
      { name: "description", content: "Reset your Travsify dashboard password securely." },
    ],
  }),
});

function getSafeNext(next?: string) {
  if (next === "/admin-login" || next === "/signin" || next === "/dashboard") return next;
  return "/dashboard";
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "set">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("set");
  }, []);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    const parsed = pwdSchema.safeParse(password);
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  if (sent) {
    return (
      <AuthShell
        eyebrow="Check your inbox"
        title={<>We sent a <span className="text-gradient-accent">recovery link</span></>}
        subtitle={`Open the email at ${email} and follow the link to set a new password.`}
      >
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <Link to="/signin" className="text-sm font-semibold text-accent story-link">Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={mode === "set" ? "Set new password" : "Reset password"}
      title={mode === "set" ? <>Choose a <span className="text-gradient-accent">strong password</span></> : <>Forgot your <span className="text-gradient-accent">password?</span></>}
      subtitle={mode === "set" ? "Use at least 8 characters." : "We'll email you a secure link to reset it."}
      footer={<>Remembered it? <Link to="/signin" className="font-semibold text-accent story-link">Sign in</Link></>}
    >
      <form onSubmit={mode === "set" ? setNewPassword : requestReset} className="space-y-4">
        {mode === "request" ? (
          <FieldShell icon={<Mail className="h-4 w-4" />} error={err}>
            <input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent outline-none" />
          </FieldShell>
        ) : (
          <FieldShell icon={<Lock className="h-4 w-4" />} error={err}>
            <input type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent outline-none" />
          </FieldShell>
        )}
        <button type="submit" disabled={loading} className="btn-glow group inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60" style={{ boxShadow: "var(--shadow-accent)" }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>{mode === "set" ? "Update password" : "Send reset link"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

function FieldShell({ icon, error, children }: { icon: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={`flex items-center gap-3 rounded-md border bg-white px-3 py-2.5 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 ${error ? "border-destructive" : "border-border"}`}>
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
