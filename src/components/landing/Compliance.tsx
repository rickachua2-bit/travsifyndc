import { Lock, Check } from "lucide-react";

const items = ["KYC & KYB verification", "Fraud detection", "Data encryption", "GDPR compliant"];
const checks = ["Identity Document", "Address Proof", "Biometric Check"];

export function Compliance() {
  return (
    <section className="border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">9</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Compliance</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-3 lg:items-center">
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight text-primary md:text-4xl">
              Enterprise-grade security & KYC verification
            </h2>
            <ul className="mt-6 space-y-3 text-base text-muted-foreground">
              {items.map((b) => <li key={b} className="flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{b}</li>)}
            </ul>
          </div>

          <div className="flex justify-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-primary shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
              <Lock className="h-16 w-16 text-white" strokeWidth={1.5} />
              <div className="absolute -inset-3 rounded-full border border-accent/30" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="mb-4 text-sm font-semibold text-foreground">KYC Verification</div>
            <div className="space-y-3">
              {checks.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <span className="font-medium text-foreground">{c}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" /> Verified</span>
                </div>
              ))}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold text-success">
                <Check className="h-3.5 w-3.5" /> Verified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
