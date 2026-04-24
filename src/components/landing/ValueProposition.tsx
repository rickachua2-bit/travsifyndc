import { Server, Boxes, CreditCard, Plane, Building2, Car, Shield, Globe2, BarChart3, Code2 } from "lucide-react";

const pillars = [
  { icon: Server, title: "Infrastructure", desc: "Scalable APIs & reliable systems built for global scale." },
  { icon: Boxes, title: "Inventory", desc: "Access 500+ airlines, 1M+ hotels, and more." },
  { icon: CreditCard, title: "Payments", desc: "Global payouts, multi-currency wallets & instant settlements." },
];

const nodes = [
  { icon: Plane, label: "Airlines", x: "30%", y: "10%" },
  { icon: Building2, label: "Hotels", x: "70%", y: "10%" },
  { icon: CreditCard, label: "Payments", x: "10%", y: "45%" },
  { icon: Car, label: "Transfers", x: "90%", y: "45%" },
  { icon: Shield, label: "Insurance", x: "20%", y: "80%" },
  { icon: Globe2, label: "e-Visas", x: "50%", y: "92%" },
  { icon: BarChart3, label: "Analytics", x: "80%", y: "80%" },
  { icon: Code2, label: "Developers", x: "55%", y: "80%" },
];

export function ValueProposition() {
  return (
    <section id="product" className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">3</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Value Proposition</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            {pillars.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-primary/5 text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-primary">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hub diagram */}
          <div className="relative aspect-square w-full max-w-lg justify-self-center">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400">
              {[
                [120, 60], [280, 60], [60, 200], [340, 200], [100, 320], [200, 360], [320, 320], [220, 320],
              ].map(([x, y], i) => (
                <line key={i} x1="200" y1="200" x2={x} y2={y} stroke="oklch(0.7 0.18 45)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              ))}
            </svg>
            {nodes.map((n) => (
              <div key={n.label} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: n.x, top: n.y }}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-accent shadow-sm">
                  <n.icon className="h-5 w-5" />
                </div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">{n.label}</div>
              </div>
            ))}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-center text-xs font-bold text-primary-foreground shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
                TRAVSIFY<br />NDC
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
