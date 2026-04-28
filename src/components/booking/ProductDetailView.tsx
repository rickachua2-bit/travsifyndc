import {
  Star, MapPin, Clock, Users, Shield, CheckCircle2,
  ChevronRight, Info, AlertCircle, Calendar, CreditCard,
  Briefcase, Wind, Users2, Languages, ArrowLeft, Wifi, Plane, Heart,
} from "lucide-react";

export interface ProductDetailProps {
  vertical: 'tours' | 'hotels' | 'transfers' | 'rentals' | 'visas' | 'insurance';
  item: any;
  searchMeta: any;
  format: (amount: number, currency?: string) => string;
  onConfirm: () => void;
  onBack: () => void;
}

function Hero({ image, title, subtitle, badge, icon }: { image?: string; title: string; subtitle?: string; badge: string; icon: React.ReactNode }) {
  return (
    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
      {image ? (
        <img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-6 left-6 right-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md">
          {icon} {badge}
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 flex items-center gap-1 text-sm text-white/80"><MapPin className="h-4 w-4" /> {subtitle}</p>}
      </div>
    </div>
  );
}

function PricePanel({ priceLabel, priceText, totalLabel, totalText, ctaLabel, onConfirm, rows }: {
  priceLabel: string; priceText: string; totalLabel: string; totalText: string; ctaLabel: string;
  onConfirm: () => void; rows: { label: string; value: string }[];
}) {
  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-3xl border border-border bg-primary p-6 text-primary-foreground shadow-2xl">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">{priceLabel}</div>
        <div className="mt-1 font-display text-4xl font-black text-accent">{priceText}</div>
        <div className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-primary-foreground/60">{r.label}</span>
              <span className="font-bold">{r.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold">
            <span>{totalLabel}</span>
            <span className="text-accent">{totalText}</span>
          </div>
        </div>
        <button
          onClick={onConfirm}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 font-display text-base font-black text-accent-foreground transition hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/20"
        >
          {ctaLabel} <ChevronRight className="h-5 w-5" />
        </button>
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/40">
          <CreditCard className="h-3 w-3" /> Secure checkout
        </div>
      </div>
    </aside>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      <h3 className="font-display text-xl font-bold text-primary">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((h, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-accent" />
          <span>{h}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProductDetailView({ vertical, item, searchMeta, format, onConfirm, onBack }: ProductDetailProps) {
  const renderTours = () => {
    const travelers = (searchMeta?.adults || 1) + (searchMeta?.children || 0);
    const unit = Number(item.price ?? item.price_amount ?? 0);
    return (
      <div className="space-y-6">
        <Hero image={item.photo || item.image_url} title={item.title} subtitle={item.location || item.country} badge="Experience" icon={<Star className="h-3.5 w-3.5" />} />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <InfoCard title="Overview">
              <p className="text-muted-foreground leading-relaxed">{item.abstract || item.description || `Discover this curated experience in ${item.location || item.country}.`}</p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-surface p-4 border border-border/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</div>
                  <div className="mt-1 flex items-center gap-2 font-bold text-primary"><Clock className="h-4 w-4 text-accent" /> {item.duration || "Varies"}</div>
                </div>
                <div className="rounded-2xl bg-surface p-4 border border-border/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Language</div>
                  <div className="mt-1 flex items-center gap-2 font-bold text-primary"><Languages className="h-4 w-4 text-accent" /> English</div>
                </div>
                <div className="rounded-2xl bg-surface p-4 border border-border/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cancellation</div>
                  <div className="mt-1 flex items-center gap-2 font-bold text-accent"><CheckCircle2 className="h-4 w-4" /> Free</div>
                </div>
              </div>
            </InfoCard>
            {Array.isArray(item.highlights) && item.highlights.length > 0 && (
              <InfoCard title="Highlights"><BulletList items={item.highlights} /></InfoCard>
            )}
            {Array.isArray(item.inclusions) && item.inclusions.length > 0 && (
              <InfoCard title="What's included"><BulletList items={item.inclusions} /></InfoCard>
            )}
          </div>
          <PricePanel
            priceLabel="From" priceText={`${format(unit)} / person`}
            totalLabel="Total" totalText={format(unit * travelers)}
            rows={[{ label: "Travelers", value: String(travelers) }]}
            ctaLabel="Reserve experience" onConfirm={onConfirm}
          />
        </div>
      </div>
    );
  };

  const renderRentals = () => {
    const specs = item.metadata?.specs || {};
    return (
      <div className="space-y-6">
        <Hero image={item.image_url || item.photo} title={item.vehicle_name} subtitle={item.location || item.country} badge="Car Rental" icon={<Briefcase className="h-3.5 w-3.5" />} />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: <Users className="h-5 w-5 text-accent" />, label: "Seats", value: `${specs.seats || 5}` },
                { icon: <Briefcase className="h-5 w-5 text-accent" />, label: "Bags", value: `${specs.bags || 2}` },
                { icon: <Wind className="h-5 w-5 text-accent" />, label: "A/C", value: specs.air_conditioning === false ? "No" : "Yes" },
                { icon: <CheckCircle2 className="h-5 w-5 text-accent" />, label: "Gearbox", value: specs.transmission || "Auto" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                  {s.icon}
                  <div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">{s.label}</div>
                    <div className="font-bold">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <InfoCard title="Rental terms">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-4"><Shield className="h-5 w-5 text-accent flex-shrink-0" /><div><h4 className="font-bold text-sm">Full insurance available</h4><p className="text-xs text-muted-foreground mt-1">CDW and theft protection can be added at pickup.</p></div></div>
                <div className="flex gap-4"><AlertCircle className="h-5 w-5 text-accent flex-shrink-0" /><div><h4 className="font-bold text-sm">Fuel policy</h4><p className="text-xs text-muted-foreground mt-1">Full-to-full. Return with the same fuel level.</p></div></div>
              </div>
            </InfoCard>
          </div>
          <PricePanel
            priceLabel="Daily rate" priceText={format(item.per_day_price ?? item.price_amount ?? 0)}
            totalLabel="Total" totalText={format(item.total_price ?? item.price_amount ?? 0)}
            rows={[
              { label: "Pick-up", value: searchMeta?.pickup_date || "—" },
              { label: "Drop-off", value: searchMeta?.dropoff_date || "—" },
            ]}
            ctaLabel="Book this vehicle" onConfirm={onConfirm}
          />
        </div>
      </div>
    );
  };

  const renderTransfers = () => (
    <div className="space-y-6">
      <Hero image={item.image_url || item.photo} title={item.vehicle_description || item.vehicle_type || "Private Transfer"} subtitle={item.provider_name || item.provider} badge="Private Transfer" icon={<Users2 className="h-3.5 w-3.5" />} />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <InfoCard title="About this transfer">
            <p className="text-muted-foreground leading-relaxed">{item.description || "Door-to-door private transfer with meet-and-greet service."}</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-surface p-4 border border-border/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Passengers</div>
                <div className="mt-1 flex items-center gap-2 font-bold text-primary"><Users className="h-4 w-4 text-accent" /> {item.passengers || searchMeta?.num_passengers || 4}</div>
              </div>
              <div className="rounded-2xl bg-surface p-4 border border-border/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meet & Greet</div>
                <div className="mt-1 flex items-center gap-2 font-bold text-accent"><CheckCircle2 className="h-4 w-4" /> Included</div>
              </div>
              <div className="rounded-2xl bg-surface p-4 border border-border/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wait time</div>
                <div className="mt-1 flex items-center gap-2 font-bold text-primary"><Clock className="h-4 w-4 text-accent" /> 60 min free</div>
              </div>
            </div>
          </InfoCard>
          {Array.isArray(item.amenities) && item.amenities.length > 0 && (
            <InfoCard title="Amenities"><BulletList items={item.amenities} /></InfoCard>
          )}
        </div>
        <PricePanel
          priceLabel="One-way" priceText={format(item.total_price ?? item.price_amount ?? 0)}
          totalLabel="Total" totalText={format(item.total_price ?? item.price_amount ?? 0)}
          rows={[
            { label: "Pick-up", value: searchMeta?.pickup_address?.split(",")[0] || "—" },
            { label: "Drop-off", value: searchMeta?.dropoff_address?.split(",")[0] || "—" },
            { label: "When", value: searchMeta?.pickup_datetime?.replace("T", " ") || "—" },
          ]}
          ctaLabel="Continue to booking" onConfirm={onConfirm}
        />
      </div>
    </div>
  );

  const renderHotels = () => {
    const nights = searchMeta?.nights || 1;
    const rooms = searchMeta?.rooms || 1;
    const unit = Number(item.price ?? 0);
    return (
      <div className="space-y-6">
        <Hero image={item.image_url || item.photo} title={item.name || "Hotel"} subtitle={item.address || item.city} badge="Hotel" icon={<Calendar className="h-3.5 w-3.5" />} />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <InfoCard title="About this hotel">
              <p className="text-muted-foreground leading-relaxed">{item.description || `Stay at ${item.name} for ${nights} night${nights > 1 ? "s" : ""}.`}</p>
            </InfoCard>
            {Array.isArray(item.amenities) && item.amenities.length > 0 && (
              <InfoCard title="Amenities"><BulletList items={item.amenities} /></InfoCard>
            )}
          </div>
          <PricePanel
            priceLabel="Per night" priceText={format(unit, item.currency)}
            totalLabel={`${nights} night${nights > 1 ? "s" : ""} × ${rooms} room${rooms > 1 ? "s" : ""}`}
            totalText={format(unit * nights * rooms, item.currency)}
            rows={[
              { label: "Check-in", value: searchMeta?.checkin || searchMeta?.check_in || "—" },
              { label: "Check-out", value: searchMeta?.checkout || searchMeta?.check_out || "—" },
            ]}
            ctaLabel="Continue to booking" onConfirm={onConfirm}
          />
        </div>
      </div>
    );
  };

  const renderInsurance = () => {
    const travelers = searchMeta?.travelers?.length || 1;
    const unit = Number(item.price ?? item.price_amount ?? 0);
    return (
      <div className="space-y-6">
        <Hero image={item.image_url || "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1600&q=80"} title={item.plan_name || item.name || "Travel Insurance"} subtitle={`${item.coverage_type || "Comprehensive"} · ${item.duration_days || ""} days`} badge="Travel Insurance" icon={<Shield className="h-3.5 w-3.5" />} />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <InfoCard title="What's covered">
              <p className="text-muted-foreground leading-relaxed">{item.coverage_details || item.description || "Comprehensive worldwide medical and trip protection."}</p>
            </InfoCard>
            {Array.isArray(item.benefits) && item.benefits.length > 0 && (
              <InfoCard title="Key benefits"><BulletList items={item.benefits} /></InfoCard>
            )}
            <InfoCard title="Good to know">
              <div className="grid gap-4 sm:grid-cols-2 text-sm text-muted-foreground">
                <div className="flex gap-3"><Heart className="h-5 w-5 text-accent flex-shrink-0" /> Emergency medical covered worldwide.</div>
                <div className="flex gap-3"><Plane className="h-5 w-5 text-accent flex-shrink-0" /> Trip cancellation & lost baggage included.</div>
              </div>
            </InfoCard>
          </div>
          <PricePanel
            priceLabel="Per traveler" priceText={format(unit)}
            totalLabel="Total" totalText={format(unit * travelers)}
            rows={[
              { label: "Travelers", value: String(travelers) },
              { label: "Destination", value: searchMeta?.destination_name || "—" },
            ]}
            ctaLabel="Continue to booking" onConfirm={onConfirm}
          />
        </div>
      </div>
    );
  };

  const renderVisas = () => {
    const travelers = searchMeta?.travelers || 1;
    const unit = Number(item.price ?? item.base_price ?? item.price_amount ?? 0);
    return (
      <div className="space-y-6">
        <Hero image={item.image_url || "https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?auto=format&fit=crop&w=1600&q=80"} title={item.title || `${item.destination_name || ""} ${item.visa_type || "eVisa"}`} subtitle={`Processing: ${item.processing_days_min || item.processing_time_days || 5}-${item.processing_days_max || item.processing_time_days || 7} days`} badge="eVisa" icon={<Shield className="h-3.5 w-3.5" />} />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <InfoCard title="About this visa">
              <p className="text-muted-foreground leading-relaxed">{item.description || item.requirement_summary || "Electronic visa application processed by our team."}</p>
            </InfoCard>
            {Array.isArray(item.requirements) && item.requirements.length > 0 && (
              <InfoCard title="Requirements"><BulletList items={item.requirements.map((r: any) => typeof r === "string" ? r : r.label || r.name)} /></InfoCard>
            )}
            {Array.isArray(item.full_requirements) && item.full_requirements.length > 0 && (
              <InfoCard title="Required documents"><BulletList items={item.full_requirements} /></InfoCard>
            )}
          </div>
          <PricePanel
            priceLabel="Per applicant" priceText={format(unit)}
            totalLabel="Total" totalText={format(unit * travelers)}
            rows={[
              { label: "Applicants", value: String(travelers) },
              { label: "Validity", value: item.validity || `${item.validity_days || 90} days` },
            ]}
            ctaLabel="Continue to application" onConfirm={onConfirm}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button onClick={onBack} className="group mb-6 flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-primary">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition group-hover:border-primary group-hover:bg-primary group-hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </div>
        Back to results
      </button>

      {vertical === 'tours' && renderTours()}
      {vertical === 'rentals' && renderRentals()}
      {vertical === 'transfers' && renderTransfers()}
      {vertical === 'hotels' && renderHotels()}
      {vertical === 'insurance' && renderInsurance()}
      {vertical === 'visas' && renderVisas()}
    </div>
  );
}
