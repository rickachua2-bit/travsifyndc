import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, Loader2, Mail, Lock, User, Building2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  fullName: z.string().trim().min(2, "Required").max(80),
  company: z.string().trim().min(2, "Required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: "Create your business account — Travsify NDC" },
      {
        name: "description",
        content:
          "Create a Travsify business account. Complete a quick KYC and unlock live API access for flights, hotels, tours, transfers, e-Visas and insurance.",
      },
    ],
  }),
});

function SignUpPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ fullName, company, email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fe[i.path[0] as string] = i.message));
      setErrors(fe);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/kyc`,
        data: { full_name: parsed.data.fullName, company: parsed.data.company },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — let's complete your KYC");
    navigate({ to: "/kyc" });
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/kyc` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <AuthShell
      eyebrow="For travel businesses"
      title={
        <>
          Create your <span className="text-gradient-accent">business account</span>
        </>
      }
      subtitle="Step 1 of 2. Next, you'll complete a quick KYC. Live API access unlocks once approved (24–72h)."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-accent story-link">
            Sign in
          </Link>
        </>
      }
    >
      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent hover:text-accent"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Your full name" icon={<User className="h-4 w-4" />} value={fullName} onChange={setFullName} placeholder="Ada Eze" error={errors.fullName} />
        <Field label="Company name" icon={<Building2 className="h-4 w-4" />} value={company} onChange={setCompany} placeholder="PathwayTrips Ltd" error={errors.company} />
        <Field label="Work email" icon={<Mail className="h-4 w-4" />} value={email} onChange={setEmail} placeholder="you@company.com" type="email" error={errors.email} />
        <Field label="Password" icon={<Lock className="h-4 w-4" />} value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" error={errors.password} />

        <button
          type="submit"
          disabled={loading}
          className="btn-glow group inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          style={{ boxShadow: "var(--shadow-accent)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              Create account & continue to KYC
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our Terms and Acceptable Use Policy. KYC required for live access.
      </p>
    </AuthShell>
  );
}

function Field({
  label, icon, value, onChange, placeholder, type = "text", error,
}: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; error?: string;
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
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none"
        />
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
