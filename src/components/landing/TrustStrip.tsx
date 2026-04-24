const partners = ["IATA", "STAR ALLIANCE", "EMIRATES", "VISA", "Flutterwave", "paystack", "amadeus"];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Powering the next generation of travel companies
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
          {partners.map((p) => (
            <div key={p} className="font-display text-xl font-bold tracking-tight text-primary/80 grayscale">
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
