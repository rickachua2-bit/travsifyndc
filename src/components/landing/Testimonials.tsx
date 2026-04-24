const reviews = [
  { quote: "Travsify NDC helped us scale our platform globally with just one integration.", name: "Adebayo O.", role: "CEO, TravelWings" },
  { quote: "Best API platform we've used. Reliable, fast and amazing support.", name: "Sarah K.", role: "CTO, TripWay" },
  { quote: "The fintech infrastructure is a game changer for Africa.", name: "Daniel M.", role: "Founder, PayTour" },
];

export function Testimonials() {
  return (
    <section className="border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex items-center gap-3">
          <span className="rounded bg-primary px-2 py-1 font-mono text-[10px] font-bold text-primary-foreground">11</span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Testimonials</span>
        </div>
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-center">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-primary md:text-5xl">
            Trusted by innovative travel businesses.
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.name} className="rounded-xl border border-border bg-white p-5 shadow-soft" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="font-display text-3xl font-bold text-accent">"</div>
                <p className="text-sm leading-relaxed text-foreground">{r.quote}</p>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent/30 to-primary/30" />
                  <div>
                    <div className="text-xs font-semibold text-primary">{r.name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
