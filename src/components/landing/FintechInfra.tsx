import { User, Briefcase, Home, ArrowRight } from "lucide-react";

const bullets = ["Multi-currency wallets", "Instant settlements", "Low fees, High success rate", "Payouts to 120+ countries"];

const txs = [
  { label: "Booking Payment", amount: "+ $1,250.00", color: "text-success" },
  { label: "Payout to Bank", amount: "− $850.00", color: "text-foreground" },
  { label: "Refund", amount: "+ $150.00", color: "text-success" },
];

export function FintechInfra() {
  return (
    <section className="border-b border-border bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">6</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Fintech Infrastructure</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
              Get paid globally.<br />Instantly.
            </h2>
            <ul className="mt-6 space-y-3 text-base text-muted-foreground">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />{b}
                </li>
              ))}
            </ul>

            {/* Flow */}
            <div className="mt-12 flex items-center justify-between">
              {[
                { i: User, l: "Customer" },
                { i: Briefcase, l: "Your Business" },
                { i: Home, l: "Global Payout" },
              ].map((s, i, arr) => (
                <div key={s.l} className="flex flex-1 items-center">
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white text-primary">
                      <s.i className="h-5 w-5" />
                    </div>
                    <div className="mt-2 text-xs font-medium text-muted-foreground">{s.l}</div>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="mx-2 flex-1 text-accent/40" />}
                </div>
              ))}
            </div>
          </div>

          {/* Wallet card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-elevated" style={{ boxShadow: "var(--shadow-elevated)" }}>
            <div className="mb-4 text-sm font-semibold text-foreground">Wallet Balance</div>
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface-2 p-4">
                <div className="text-xs font-semibold text-muted-foreground">USD</div>
                <div className="mt-1 font-display text-xl font-bold text-primary">$45,680.50</div>
              </div>
              <div className="rounded-lg bg-success/10 p-4 ring-1 ring-success/30">
                <div className="text-xs font-semibold text-success">NGN</div>
                <div className="mt-1 font-display text-xl font-bold text-success">₦32,560,000.00</div>
              </div>
            </div>
            <div className="mb-3 text-sm font-semibold text-foreground">Recent Transactions</div>
            <div className="space-y-2">
              {txs.map((t) => (
                <div key={t.label} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-accent/10" />
                    <span className="font-medium text-foreground">{t.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-semibold ${t.color}`}>{t.amount}</span>
                    <span className="rounded bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
