import { useState } from "react";
import { 
  Star, MapPin, Clock, Users, Shield, CheckCircle2, 
  ChevronRight, Info, AlertCircle, Calendar, CreditCard,
  Briefcase, Wind, Users2, Languages, ArrowLeft
} from "lucide-react";

export interface ProductDetailProps {
  vertical: 'tours' | 'hotels' | 'transfers' | 'rentals' | 'visas' | 'insurance';
  item: any;
  searchMeta: any;
  format: (amount: number, currency?: string) => string;
  onConfirm: () => void;
  onBack: () => void;
}

export function ProductDetailView({ 
  vertical, item, searchMeta, format, onConfirm, onBack 
}: ProductDetailProps) {
  
  const getVerticalIcon = () => {
    switch (vertical) {
      case 'tours': return <Star className="h-5 w-5 text-accent" />;
      case 'hotels': return <Calendar className="h-5 w-5 text-accent" />;
      case 'transfers': return <Users2 className="h-5 w-5 text-accent" />;
      case 'rentals': return <Briefcase className="h-5 w-5 text-accent" />;
      case 'visas': return <Shield className="h-5 w-5 text-accent" />;
      default: return <Info className="h-5 w-5 text-accent" />;
    }
  };

  const renderTours = () => (
    <div className="space-y-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border shadow-2xl">
        <img 
          src={item.photo || item.image_url} 
          alt={item.title} 
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-foreground/90 bg-accent/20 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-white/10">
            {getVerticalIcon()}
            Experience
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight lg:text-4xl">
            {item.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <h3 className="font-display text-xl font-bold text-primary">Overview</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {item.abstract || item.description || "Discover this amazing experience with Travsify's global curated inventory."}
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4 border border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</span>
                <span className="flex items-center gap-2 font-bold text-primary">
                  <Clock className="h-4 w-4 text-accent" /> {item.duration || "Varies"}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4 border border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Language</span>
                <span className="flex items-center gap-2 font-bold text-primary">
                  <Languages className="h-4 w-4 text-accent" /> English
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4 border border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cancelation</span>
                <span className="flex items-center gap-2 font-bold text-accent">
                  <CheckCircle2 className="h-4 w-4" /> Free
                </span>
              </div>
            </div>
          </section>

          {item.highlights && item.highlights.length > 0 && (
            <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <h3 className="font-display text-xl font-bold text-primary">Experience Highlights</h3>
              <ul className="mt-4 space-y-3">
                {item.highlights.map((h: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-accent" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="sticky top-24 rounded-3xl border border-border bg-primary p-6 text-primary-foreground shadow-2xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">Starting from</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-4xl font-black text-accent">{format(item.price || item.price_amount)}</span>
              <span className="text-sm text-primary-foreground/60">/ person</span>
            </div>

            <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary-foreground/60">Travelers</span>
                <span className="font-bold">{searchMeta.adults + (searchMeta.children || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-accent">{format((item.price || item.price_amount) * (searchMeta.adults + (searchMeta.children || 0)))}</span>
              </div>
            </div>

            <button 
              onClick={onConfirm}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 font-display text-lg font-black text-accent-foreground transition hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/20"
            >
              Reserve Experience <ChevronRight className="h-5 w-5" />
            </button>
            <p className="mt-4 text-center text-[10px] text-primary-foreground/40 uppercase tracking-widest">Secure checkout via Travsify Settle</p>
          </div>
        </aside>
      </div>
    </div>
  );

  const renderRentals = () => (
    <div className="space-y-6">
       <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
        <img 
          src={item.image_url || item.photo} 
          alt={item.vehicle_name} 
          className="h-full w-full object-contain p-8 transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-accent/20">
            <Briefcase className="h-4 w-4" /> Professional Rental
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-primary lg:text-4xl">
            {item.vehicle_name}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-4 w-4" /> {item.location || item.country}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
           <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                <Users className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Seats</div>
                  <div className="font-bold">{item.metadata?.specs?.seats || 5} People</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                <Briefcase className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Luggage</div>
                  <div className="font-bold">{item.metadata?.specs?.bags || 2} Bags</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                <Wind className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">A/C</div>
                  <div className="font-bold">Included</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                <CheckCircle2 className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Gearbox</div>
                  <div className="font-bold">{item.metadata?.specs?.transmission || "Automatic"}</div>
                </div>
              </div>
           </div>

           <section className="rounded-3xl border border-border bg-white p-6">
              <h3 className="font-display text-xl font-bold">Rental Terms</h3>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Full Insurance Available</h4>
                    <p className="text-xs text-muted-foreground mt-1">Collision Damage Waiver and Theft Protection can be added at pickup.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Fuel Policy</h4>
                    <p className="text-xs text-muted-foreground mt-1">Full-to-full. Return with the same amount of fuel to avoid charges.</p>
                  </div>
                </div>
              </div>
           </section>
        </div>

        <aside>
          <div className="rounded-3xl border border-border bg-white p-6 shadow-xl">
             <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily rate</div>
             <div className="mt-1 flex items-baseline gap-2 font-display text-4xl font-black text-primary">
                {format(item.price || item.price_amount)}
             </div>
             
             <div className="mt-6 space-y-3 rounded-2xl bg-surface p-4">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Pick-up</span>
                 <span className="font-bold">{searchMeta.pickup_date}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Drop-off</span>
                 <span className="font-bold">{searchMeta.dropoff_date}</span>
               </div>
             </div>

             <button 
               onClick={onConfirm}
               className="mt-6 w-full rounded-2xl bg-primary px-6 py-4 font-display text-lg font-black text-white transition hover:bg-primary/90 shadow-lg shadow-primary/20"
             >
               Book this Vehicle
             </button>
             <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
               <CreditCard className="h-3 w-3" /> Secure Reservation
             </div>
          </div>
        </aside>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button 
        onClick={onBack}
        className="group mb-6 flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-primary"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition group-hover:border-primary group-hover:bg-primary group-hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </div>
        Back to Results
      </button>

      {vertical === 'tours' && renderTours()}
      {vertical === 'rentals' && renderRentals()}
      
      {/* Fallback for other verticals or simpler preview */}
      {vertical !== 'tours' && vertical !== 'rentals' && (
        <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-soft">
           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              {getVerticalIcon()}
           </div>
           <h1 className="mt-6 font-display text-3xl font-extrabold text-primary">{item.title || item.vehicle_name || "Product Details"}</h1>
           <p className="mt-4 text-muted-foreground max-w-md mx-auto">
             Review the details below before proceeding with your secure booking.
           </p>
           <div className="mt-8 flex justify-center">
             <button 
               onClick={onConfirm}
               className="btn-glow rounded-2xl bg-accent px-12 py-4 font-display text-xl font-black text-accent-foreground"
             >
               Confirm & Continue
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
