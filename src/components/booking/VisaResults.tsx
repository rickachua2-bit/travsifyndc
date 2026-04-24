import { CheckCircle2, Clock, FileText, Globe2, ArrowRight } from "lucide-react";

export type VisaProduct = {
  id: string;
  nationality: string;
  nationality_name: string;
  destination: string;
  destination_name: string;
  visa_type: string;
  entry_type: string;
  validity_days: number;
  max_stay_days: number;
  processing_days_min: number;
  processing_days_max: number;
  requirements: string[];
  description: string;
  image_url: string | null;
  sherpa_url: string | null;
  base_price: number;
  base_currency: string;
  price: number;
  currency: string;
};

export function VisaResults({
  products,
  nationalityLabel,
  destinationLabel,
  format,
  onSelect,
}: {
  products: VisaProduct[];
  nationalityLabel: string;
  destinationLabel: string;
  format: (amount: number, currency?: string) => string;
  onSelect: (p: VisaProduct) => void;
}) {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-border bg-white p-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-primary">
            {products.length} visa option{products.length !== 1 ? "s" : ""} for{" "}
            <span className="text-accent">{nationalityLabel}</span> travellers
            {destinationLabel !== "Any destination" && <> → {destinationLabel}</>}
          </h3>
          <p className="text-xs text-muted-foreground">All-inclusive pricing — government fees, processing & service.</p>
        </div>
      </div>

      {products.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
          No visa corridors available for this combination yet. We're adding more — check back soon.
        </div>
      )}

      <div className="grid gap-3">
        {products.map((p) => (
          <VisaCard key={p.id} product={p} format={format} onSelect={() => onSelect(p)} />
        ))}
      </div>
    </div>
  );
}

function VisaCard({
  product,
  format,
  onSelect,
}: {
  product: VisaProduct;
  format: (a: number, c?: string) => string;
  onSelect: () => void;
}) {
  const proc = product.processing_days_min === product.processing_days_max
    ? `${product.processing_days_max} day${product.processing_days_max === 1 ? "" : "s"}`
    : `${product.processing_days_min}–${product.processing_days_max} days`;
  const validity = product.validity_days >= 365
    ? `${Math.round(product.validity_days / 365)} year${product.validity_days >= 730 ? "s" : ""}`
    : `${product.validity_days} days`;

  return (
    <article
      className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-white transition hover:border-accent sm:grid-cols-[1fr_200px]"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="font-display text-base font-extrabold leading-tight text-primary">
              {product.destination_name} {product.visa_type} Visa
            </h4>
            <p className="text-xs text-muted-foreground">{product.description}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
            <Globe2 className="h-3 w-3" /> {product.entry_type === "multiple" ? "Multi-entry" : "Single entry"}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> Processing: <strong className="text-foreground">{proc}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Validity: <strong className="text-foreground">{validity}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Max stay: <strong className="text-foreground">{product.max_stay_days} days</strong>
          </span>
        </div>

        {product.requirements.length > 0 && (
          <div>
            <div className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3 w-3" /> What you'll need
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.requirements.slice(0, 5).map((r, i) => (
                <span key={i} className="inline-flex items-center rounded-md bg-surface px-2 py-0.5 text-[11px] text-foreground">
                  {r}
                </span>
              ))}
              {product.requirements.length > 5 && (
                <span className="inline-flex items-center rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                  +{product.requirements.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end justify-between gap-2 border-t border-border bg-surface/40 p-5 sm:border-l sm:border-t-0">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">All-inclusive</div>
          <div className="font-display text-2xl font-extrabold text-primary">{format(product.price, product.currency)}</div>
          <div className="text-[10px] text-muted-foreground">per traveller</div>
        </div>
        <button
          onClick={onSelect}
          className="btn-glow inline-flex w-full items-center justify-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
        >
          Apply now <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
