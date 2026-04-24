import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Loader2, Mail, Lock, Building2, User, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VERTICALS = ["Flights", "Hotels", "Tours", "Transfers", "e-Visas", "Insurance"] as const;
const VOLUMES = ["< 1k bookings/mo", "1k–10k", "10k–100k", "100k+"];

const accountSchema = z.object({
  fullName: z.string().trim().min(2, "Required").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});
const companySchema = z.object({
  company: z.string().trim().min(2, "Required").max(120),
  country: z.string().trim().min(2, "Required").max(80),
  monthlyVolume: z.string().min(1, "Pick one"),
});
const useCaseSchema = z.object({
  verticals: z.array(z.string()).min(1, "Pick at least one"),
  useCase: z.string().trim().min(20, "Tell us a bit more (20+ chars)").max(800),
});

export const Route = createFileRoute("/get-api-access")({
  component: GetApiAccessPage,
  head: () => ({
    meta: [
      { title: "Get API Access — Travsify NDC" },
      { name: "description", content: "Apply for sandbox + live API access. Flights, hotels, tours, transfers, e-Visas and insurance through one integration." },
    ],
  }),
});

function GetApiAccessPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [verticals, setVerticals] = useState<string[]>([]);
  const [useCase, setUseCase] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep(): boolean {
    setErrors({});
    let res;
    if (step === 0) res = accountSchema.safeParse({ fullName, email, password });
    else if (step === 1) res = companySchema.safeParse({ company, country, monthlyVolume });
    else res = useCaseSchema.safeParse({ verticals, useCase });
    if (!res.success) {
      const e: Record<string, string> = {};
      res.error.issues.forEach((i) => (e[i.path[0] as string] = i.message));
      setErrors(e);
      return false;
    }
    return true;
  }

  async function submit() {
    if (!validateStep()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, company },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      await supabase.from("api_access_requests").insert({
        user_id: userId,
        email,
        full_name: fullName,
        company,
        country,
        monthly_volume: monthlyVolume,
        verticals,
        use_case: useCase,
      });
    }

    setLoading(false);
    setDone(true);
    toast.success("Application received");
    setTimeout(() => navigate({ to: "/dashboard" }), 1800);
  }

  if (done) {
    return (
      <AuthShell
        eyebrow="Application received"
        title={<>You're <span className="text-gradient-accent">in.</span></>}
        subtitle="Redirecting you to your dashboard…"
      >
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your sandbox is being provisioned. Our team will review your live access request within 24 hours.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={`Step ${step + 1} of 3`}
      title={<>Get your <span className="text-gradient-accent">API keys</span> in 60 seconds</>}
      subtitle="Sandbox is instant. Live access ships within 24 hours after a quick review."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-accent story-link">Sign in</Link>
        </>
      }
    >
      <Stepper step={step} />

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Full name" icon={<User className="h-4 w-4" />} value={fullName} onChange={setFullName} placeholder="Ada Eze" error={errors.fullName} />
          <Field label="Work email" icon={<Mail className="h-4 w-4" />} value={email} onChange={setEmail} placeholder="you@company.com" type="email" error={errors.email} />
          <Field label="Password" icon={<Lock className="h-4 w-4" />} value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" error={errors.password} />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Company" icon={<Building2 className="h-4 w-4" />} value={company} onChange={setCompany} placeholder="PathwayTrips Ltd" error={errors.company} />
          <Field label="Country" icon={<Building2 className="h-4 w-4" />} value={country} onChange={setCountry} placeholder="Nigeria" error={errors.country} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected monthly volume</label>
            <div className="grid grid-cols-2 gap-2">
              {VOLUMES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMonthlyVolume(v)}
                  className={`rounded-md border px-3 py-2.5 text-left text-sm transition ${
                    monthlyVolume === v ? "border-accent bg-accent/5 text-accent" : "border-border bg-white text-foreground hover:border-accent/60"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {errors.monthlyVolume && <p className="mt-1 text-xs font-medium text-destructive">{errors.monthlyVolume}</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Which products will you sell?</label>
            <div className="grid grid-cols-2 gap-2">
              {VERTICALS.map((v) => {
                const active = verticals.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setVerticals((prev) => (prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v]))
                    }
                    className={`rounded-md border px-3 py-2.5 text-left text-sm transition ${
                      active ? "border-accent bg-accent/5 text-accent" : "border-border bg-white text-foreground hover:border-accent/60"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            {errors.verticals && <p className="mt-1 text-xs font-medium text-destructive">{errors.verticals}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tell us about your use case</label>
            <textarea
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              rows={4}
              maxLength={800}
              placeholder="We're building a B2C travel super-app for West Africa…"
              className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 ${
                errors.useCase ? "border-destructive" : "border-border"
              }`}
            />
            {errors.useCase && <p className="mt-1 text-xs font-medium text-destructive">{errors.useCase}</p>}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : <span />}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (step < 2) {
              if (validateStep()) setStep(step + 1);
            } else {
              submit();
            }
          }}
          className="btn-glow group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          style={{ boxShadow: "var(--shadow-accent)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <>
              {step < 2 ? "Continue" : "Create account"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </AuthShell>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-accent" : "bg-border"}`}
        />
      ))}
    </div>
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
