const partners = [
  "IATA",
  "STAR ALLIANCE",
  "EMIRATES",
  "VISA",
  "Flutterwave",
  "Paystack",
  "Amadeus",
  "Sabre",
  "Mastercard",
  "Stripe",
];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Powering the next generation of travel companies
        </p>
        <div
          className="group relative mt-8 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <div className="flex w-max animate-ticker gap-12 group-hover:[animation-play-state:paused]">
            {[...partners, ...partners].map((p, i) => (
              <div
                key={`${p}-${i}`}
                className="font-display text-xl font-bold tracking-tight text-primary/70 transition hover:text-accent"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
