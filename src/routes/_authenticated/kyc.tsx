import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, Loader2, Save, LogOut, CheckCircle2,
  Building2, MapPin, Phone, Target, FileCheck2,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kyc")({
  component: KycWizard,
  head: () => ({
    meta: [
      { title: "Complete your KYC — Travsify NDC" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const VERTICALS = ["Flights", "Hotels", "Tours", "Transfers", "e-Visas", "Insurance"] as const;
const VOLUMES = ["< 1k bookings/mo", "1k–10k", "10k–100k", "100k+"];
const BUSINESS_TYPES = ["OTA / Travel platform", "Tour operator", "TMC / Corporate travel", "Super-app / Marketplace", "Bank / Fintech embedding travel", "Other"];

type FormData = {
  legal_name: string;
  trading_name: string;
  registration_number: string;
  incorporation_country: string;
  business_type: string;
  website: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_postal: string;
  address_country: string;
  contact_full_name: string;
  contact_role: string;
  contact_email: string;
  contact_phone: string;
  target_verticals: string[];
  monthly_volume: string;
  use_case: string;
};

const empty: FormData = {
  legal_name: "", trading_name: "", registration_number: "", incorporation_country: "",
  business_type: "", website: "",
  address_street: "", address_city: "", address_state: "", address_postal: "", address_country: "",
  contact_full_name: "", contact_role: "", contact_email: "", contact_phone: "",
  target_verticals: [], monthly_volume: "", use_case: "",
};

const STEPS = [
  { id: 1, title: "Company basics", icon: Building2 },
  { id: 2, title: "Business address", icon: MapPin },
  { id: 3, title: "Primary contact", icon: Phone },
  { id: 4, title: "Use case & volume", icon: Target },
  { id: 5, title: "Review & submit", icon: FileCheck2 },
];

const schemas = {
  1: z.object({
    legal_name: z.string().trim().min(2, "Required").max(160),
    trading_name: z.string().trim().max(160).optional().or(z.literal("")),
    registration_number: z.string().trim().min(2, "Required").max(80),
    incorporation_country: z.string().trim().min(2, "Required").max(80),
    business_type: z.string().min(1, "Pick one"),
    website: z.string().trim().url("Enter a valid URL").max(255),
  }),
  2: z.object({
    address_street: z.string().trim().min(2, "Required").max(200),
    address_city: z.string().trim().min(2, "Required").max(80),
    address_state: z.string().trim().max(80).optional().or(z.literal("")),
    address_postal: z.string().trim().max(20).optional().or(z.literal("")),
    address_country: z.string().trim().min(2, "Required").max(80),
  }),
  3: z.object({
    contact_full_name: z.string().trim().min(2, "Required").max(80),
    contact_role: z.string().trim().min(2, "Required").max(80),
    contact_email: z.string().trim().email("Enter a valid email").max(255),
    contact_phone: z.string().trim().min(6, "Required").max(30),
  }),
  4: z.object({
    target_verticals: z.array(z.string()).min(1, "Pick at least one"),
    monthly_volume: z.string().min(1, "Pick one"),
    use_case: z.string().trim().min(20, "Tell us a bit more (20+ chars)").max(1000),
  }),
} as const;

function KycWizard() {
  const { user, signOut } = useAuth();
  const { profile, refresh } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Hydrate draft + profile defaults
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: draft } = await supabase.from("kyc_drafts").select("*").eq("user_id", user.id).maybeSingle();
      if (draft) {
        setData({ ...empty, ...(draft.form_data as Partial<FormData>) });
        setStep(Math.min(Math.max(draft.current_step ?? 1, 1), 5));
      } else if (profile) {
        // Pre-fill from rejected submission so user can resubmit
        setData({
          ...empty,
          legal_name: profile.legal_name ?? "",
          trading_name: profile.trading_name ?? "",
          registration_number: profile.registration_number ?? "",
          incorporation_country: profile.incorporation_country ?? "",
          business_type: profile.business_type ?? "",
          website: profile.website ?? "",
          address_street: profile.business_address?.street ?? "",
          address_city: profile.business_address?.city ?? "",
          address_state: profile.business_address?.state ?? "",
          address_postal: profile.business_address?.postal ?? "",
          address_country: profile.business_address?.country ?? profile.country ?? "",
          contact_full_name: profile.full_name ?? "",
          contact_role: profile.contact_role ?? "",
          contact_email: user.email ?? "",
          contact_phone: profile.contact_phone ?? "",
          target_verticals: profile.target_verticals ?? [],
          monthly_volume: profile.monthly_volume ?? "",
          use_case: profile.use_case ?? "",
        });
      } else {
        setData((d) => ({ ...d, contact_email: user.email ?? "" }));
      }
      setHydrated(true);
    })();
  }, [user, profile]);

  // Debounced auto-save
  useEffect(() => {
    if (!user || !hydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("kyc_drafts")
        .upsert({ user_id: user.id, current_step: step, form_data: data }, { onConflict: "user_id" });
      if (!error) setSavedAt(new Date());
    }, 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [data, step, user, hydrated]);

  function validateStep(): boolean {
    setErrors({});
    if (step === 5) return true;
    const schema = schemas[step as 1 | 2 | 3 | 4];
    const res = schema.safeParse(data);
    if (!res.success) {
      const e: Record<string, string> = {};
      res.error.issues.forEach((i) => (e[i.path[0] as string] = i.message));
      setErrors(e);
      return false;
    }
    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 5));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function saveAndExit() {
    toast.success("Progress saved. You can finish KYC anytime from your dashboard.");
    navigate({ to: "/dashboard" });
  }

  async function submit() {
    if (!user) return;
    // Validate all steps
    for (const s of [1, 2, 3, 4] as const) {
      const res = schemas[s].safeParse(data);
      if (!res.success) {
        setStep(s);
        const e: Record<string, string> = {};
        res.error.issues.forEach((i) => (e[i.path[0] as string] = i.message));
        setErrors(e);
        toast.error("Please complete all required fields");
        return;
      }
    }

    setSubmitting(true);
    const business_address = {
      street: data.address_street,
      city: data.address_city,
      state: data.address_state,
      postal: data.address_postal,
      country: data.address_country,
    };

    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        legal_name: data.legal_name,
        trading_name: data.trading_name || null,
        registration_number: data.registration_number,
        incorporation_country: data.incorporation_country,
        business_type: data.business_type,
        website: data.website,
        business_address,
        country: data.address_country,
        full_name: data.contact_full_name,
        contact_role: data.contact_role,
        contact_phone: data.contact_phone,
        target_verticals: data.target_verticals,
        monthly_volume: data.monthly_volume,
        use_case: data.use_case,
        kyc_status: "submitted",
        kyc_submitted_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", user.id);

    if (profErr) {
      setSubmitting(false);
      toast.error(profErr.message);
      return;
    }

    // Mirror into api_access_requests for the admin queue convenience
    await supabase.from("api_access_requests").insert({
      user_id: user.id,
      email: user.email ?? "",
      full_name: data.contact_full_name,
      company: data.legal_name,
      country: data.incorporation_country,
      monthly_volume: data.monthly_volume,
      verticals: data.target_verticals,
      use_case: data.use_case,
      status: "pending",
    });

    // Clean up draft
    await supabase.from("kyc_drafts").delete().eq("user_id", user.id);

    setSubmitting(false);
    toast.success("KYC submitted! Your sandbox is ready — start testing while we review (24–72h).");
    await refresh();
    navigate({ to: "/dashboard" });
  }

  const progress = useMemo(() => Math.round(((step - 1) / 4) * 100), [step]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                <Save className="h-3 w-3" /> Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={saveAndExit} className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">
              <LogOut className="h-3.5 w-3.5" /> Save & exit
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Business KYC</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-primary md:text-4xl">
          Tell us about your <span className="text-gradient-accent">business</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          We collect this once. Approval typically takes 24–72 hours. You'll get sandbox access immediately and can build while we review.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-2">
            <div className="rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Step {step} of 5</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ol className="rounded-xl border border-border bg-white p-2" style={{ boxShadow: "var(--shadow-soft)" }}>
              {STEPS.map((s) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isDone = step > s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setStep(s.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        isActive ? "bg-accent/10 text-accent" : isDone ? "text-foreground hover:bg-muted" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md ${isActive ? "bg-accent text-accent-foreground" : isDone ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <span className="font-medium">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section className="rounded-2xl border border-border bg-white p-6 md:p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
            {!hydrated ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
            ) : (
              <>
                {step === 1 && <Step1 data={data} setData={setData} errors={errors} />}
                {step === 2 && <Step2 data={data} setData={setData} errors={errors} />}
                {step === 3 && <Step3 data={data} setData={setData} errors={errors} />}
                {step === 4 && <Step4 data={data} setData={setData} errors={errors} />}
                {step === 5 && <Review data={data} onJump={setStep} />}

                <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
                  {step > 1 ? (
                    <button onClick={back} className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:border-accent hover:text-accent">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  ) : <span />}
                  {step < 5 ? (
                    <button onClick={next} className="btn-glow inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground" style={{ boxShadow: "var(--shadow-accent)" }}>
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={submit} disabled={submitting} className="btn-glow inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60" style={{ boxShadow: "var(--shadow-accent)" }}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit for review <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

type StepProps = { data: FormData; setData: React.Dispatch<React.SetStateAction<FormData>>; errors: Record<string, string> };

function Step1({ data, setData, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <Header title="Company basics" desc="Use your registered company information." />
      <div className="grid gap-4 md:grid-cols-2">
        <Text label="Registered legal name" value={data.legal_name} onChange={(v) => setData({ ...data, legal_name: v })} placeholder="PathwayTrips Limited" error={errors.legal_name} />
        <Text label="Trading name (optional)" value={data.trading_name} onChange={(v) => setData({ ...data, trading_name: v })} placeholder="Pathway" />
        <Text label="Registration / incorporation number" value={data.registration_number} onChange={(v) => setData({ ...data, registration_number: v })} placeholder="RC-1234567" error={errors.registration_number} />
        <Text label="Country of incorporation" value={data.incorporation_country} onChange={(v) => setData({ ...data, incorporation_country: v })} placeholder="Nigeria" error={errors.incorporation_country} />
        <Pills label="Business type" value={data.business_type} options={BUSINESS_TYPES} onChange={(v) => setData({ ...data, business_type: v })} error={errors.business_type} />
        <Text label="Website" value={data.website} onChange={(v) => setData({ ...data, website: v })} placeholder="https://yourcompany.com" error={errors.website} />
      </div>
    </div>
  );
}

function Step2({ data, setData, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <Header title="Business address" desc="The registered address of your business." />
      <div className="grid gap-4">
        <Text label="Street address" value={data.address_street} onChange={(v) => setData({ ...data, address_street: v })} placeholder="12 Lagos Street" error={errors.address_street} />
        <div className="grid gap-4 md:grid-cols-2">
          <Text label="City" value={data.address_city} onChange={(v) => setData({ ...data, address_city: v })} placeholder="Lagos" error={errors.address_city} />
          <Text label="State / region" value={data.address_state} onChange={(v) => setData({ ...data, address_state: v })} placeholder="Lagos State" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Text label="Postal code" value={data.address_postal} onChange={(v) => setData({ ...data, address_postal: v })} placeholder="100001" />
          <Text label="Country" value={data.address_country} onChange={(v) => setData({ ...data, address_country: v })} placeholder="Nigeria" error={errors.address_country} />
        </div>
      </div>
    </div>
  );
}

function Step3({ data, setData, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <Header title="Primary contact" desc="The person we'll reach out to about this application." />
      <div className="grid gap-4 md:grid-cols-2">
        <Text label="Full name" value={data.contact_full_name} onChange={(v) => setData({ ...data, contact_full_name: v })} placeholder="Ada Eze" error={errors.contact_full_name} />
        <Text label="Role / title" value={data.contact_role} onChange={(v) => setData({ ...data, contact_role: v })} placeholder="CTO" error={errors.contact_role} />
        <Text label="Email" value={data.contact_email} onChange={(v) => setData({ ...data, contact_email: v })} placeholder="ada@pathwaytrips.com" type="email" error={errors.contact_email} />
        <Text label="Phone" value={data.contact_phone} onChange={(v) => setData({ ...data, contact_phone: v })} placeholder="+234 800 000 0000" error={errors.contact_phone} />
      </div>
    </div>
  );
}

function Step4({ data, setData, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <Header title="Use case & volume" desc="Helps us right-size your sandbox and onboarding." />
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Which products will you sell?</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {VERTICALS.map((v) => {
            const active = data.target_verticals.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => setData({
                  ...data,
                  target_verticals: active ? data.target_verticals.filter((x) => x !== v) : [...data.target_verticals, v],
                })}
                className={`rounded-md border px-3 py-2.5 text-left text-sm transition ${active ? "border-accent bg-accent/5 text-accent" : "border-border bg-white text-foreground hover:border-accent/60"}`}
              >
                {v}
              </button>
            );
          })}
        </div>
        {errors.target_verticals && <p className="mt-1 text-xs font-medium text-destructive">{errors.target_verticals}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected monthly volume</label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {VOLUMES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setData({ ...data, monthly_volume: v })}
              className={`rounded-md border px-3 py-2.5 text-left text-sm transition ${data.monthly_volume === v ? "border-accent bg-accent/5 text-accent" : "border-border bg-white text-foreground hover:border-accent/60"}`}
            >
              {v}
            </button>
          ))}
        </div>
        {errors.monthly_volume && <p className="mt-1 text-xs font-medium text-destructive">{errors.monthly_volume}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tell us about your use case</label>
        <textarea
          value={data.use_case}
          onChange={(e) => setData({ ...data, use_case: e.target.value })}
          rows={5}
          maxLength={1000}
          placeholder="We're building a B2C travel super-app for West Africa, starting with flights + e-Visas…"
          className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 ${errors.use_case ? "border-destructive" : "border-border"}`}
        />
        {errors.use_case && <p className="mt-1 text-xs font-medium text-destructive">{errors.use_case}</p>}
      </div>
    </div>
  );
}

function Review({ data, onJump }: { data: FormData; onJump: (step: number) => void }) {
  return (
    <div className="space-y-6">
      <Header title="Review & submit" desc="Double-check everything below. You can edit any section before submitting." />

      <ReviewSection title="Company basics" onEdit={() => onJump(1)}>
        <Row k="Legal name" v={data.legal_name} />
        <Row k="Trading name" v={data.trading_name || "—"} />
        <Row k="Registration #" v={data.registration_number} />
        <Row k="Incorporation country" v={data.incorporation_country} />
        <Row k="Business type" v={data.business_type} />
        <Row k="Website" v={data.website} />
      </ReviewSection>

      <ReviewSection title="Business address" onEdit={() => onJump(2)}>
        <Row k="Street" v={data.address_street} />
        <Row k="City" v={data.address_city} />
        <Row k="State" v={data.address_state || "—"} />
        <Row k="Postal" v={data.address_postal || "—"} />
        <Row k="Country" v={data.address_country} />
      </ReviewSection>

      <ReviewSection title="Primary contact" onEdit={() => onJump(3)}>
        <Row k="Name" v={data.contact_full_name} />
        <Row k="Role" v={data.contact_role} />
        <Row k="Email" v={data.contact_email} />
        <Row k="Phone" v={data.contact_phone} />
      </ReviewSection>

      <ReviewSection title="Use case & volume" onEdit={() => onJump(4)}>
        <Row k="Verticals" v={data.target_verticals.join(", ")} />
        <Row k="Monthly volume" v={data.monthly_volume} />
        <Row k="Use case" v={data.use_case} />
      </ReviewSection>

      <p className="text-xs text-muted-foreground">
        By submitting you confirm the above information is accurate. Providing false information may result in account termination.
      </p>
    </div>
  );
}

function Header({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-2 border-b border-border pb-4">
      <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Text({ label, value, onChange, placeholder, type = "text", error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 ${error ? "border-destructive" : "border-border"}`}
      />
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Pills({ label, value, options, onChange, error }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${value === o ? "border-accent bg-accent/10 text-accent" : "border-border bg-white text-foreground hover:border-accent/60"}`}
          >
            {o}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-primary">{title}</h3>
        <button onClick={onEdit} className="text-xs font-semibold text-accent hover:underline">Edit</button>
      </div>
      <dl className="grid gap-1.5 text-sm">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}
