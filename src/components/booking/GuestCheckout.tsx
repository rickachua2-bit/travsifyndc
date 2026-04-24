import { useEffect, useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { StripeProvider } from "@/components/wallet/StripeProvider";
import { guestCheckout } from "@/server/booking-engine";

export type ContactDetails = { name: string; email: string; phone: string };

export type CheckoutInput = {
  vertical: "flights" | "hotels" | "tours" | "transfers" | "insurance" | "visas";
  base_amount: number;        // pre-markup, supplier price
  currency: string;
  contact: ContactDetails;
  payload: Record<string, unknown>;  // vertical-specific data carried to webhook fulfillment
};

/**
 * Shows a confirmation screen on success. The parent passes a CheckoutInput
 * (already-validated) and we handle: server-side booking creation + Stripe
 * intent → Elements form → confirmPayment → success state.
 */
export function GuestCheckout({
  input,
  onCancel,
  onSuccess,
}: {
  input: CheckoutInput;
  onCancel: () => void;
  onSuccess: (result: { reference: string; amount: number; currency: string }) => void;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<{ provider_base: number; travsify_markup: number; total: number; currency: string } | null>(null);
  const [creating, setCreating] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await guestCheckout({ data: input });
        if (cancelled) return;
        setSecret(res.client_secret);
        setReference(res.reference);
        setAmount(res.amount);
        setBreakdown(res.price_breakdown);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [input]);

  if (creating) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-6">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span className="text-sm text-muted-foreground">Preparing secure checkout…</span>
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h3 className="font-display text-base font-bold text-destructive">Checkout error</h3>
        <p className="mt-1 text-sm text-muted-foreground">{err}</p>
        <button onClick={onCancel} className="mt-3 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold">Back</button>
      </div>
    );
  }
  if (!secret || !reference) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-5">
      <div className="rounded-2xl border border-border bg-white p-5 sm:col-span-3" style={{ boxShadow: "var(--shadow-soft)" }}>
        <h3 className="font-display text-base font-bold text-primary">Secure card payment</h3>
        <p className="mt-1 text-xs text-muted-foreground">Confirmation will be emailed to {input.contact.email}.</p>
        <StripeProvider clientSecret={secret}>
          <CheckoutForm
            reference={reference}
            amount={amount}
            currency={input.currency}
            onSuccess={() => onSuccess({ reference, amount, currency: input.currency })}
          />
        </StripeProvider>
      </div>

      <aside className="rounded-2xl border border-border bg-surface/40 p-5 sm:col-span-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your booking</div>
        <div className="mt-1 font-display text-lg font-bold capitalize text-primary">{input.vertical}</div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">Ref · {reference}</div>

        {breakdown && (
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Supplier price</dt><dd>{input.currency} {breakdown.provider_base.toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Service fee</dt><dd>{input.currency} {breakdown.travsify_markup.toLocaleString()}</dd></div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-extrabold text-primary"><dt>Total</dt><dd>{input.currency} {breakdown.total.toLocaleString()}</dd></div>
          </dl>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          PCI-DSS Stripe checkout · Refund policy applies
        </div>

        <button onClick={onCancel} className="mt-4 w-full rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold hover:border-accent">
          Cancel and choose another option
        </button>
      </aside>
    </div>
  );
}

function CheckoutForm({ reference, amount, currency, onSuccess }: { reference: string; amount: number; currency: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (error) {
        toast.error(error.message ?? "Payment failed");
      } else if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        toast.success(`Payment received · ${reference}`);
        onSuccess();
      }
    } finally { setPaying(false); }
  }

  return (
    <form onSubmit={pay} className="mt-4 space-y-4">
      <PaymentElement />
      <button disabled={!stripe || paying} className="btn-glow w-full rounded-md bg-accent px-4 py-3 text-sm font-bold text-accent-foreground disabled:opacity-50" style={{ boxShadow: "var(--shadow-accent)" }}>
        {paying ? "Processing…" : `Pay ${currency} ${amount.toLocaleString()}`}
      </button>
    </form>
  );
}

export function ConfirmationScreen({ reference, amount, currency, vertical, fulfillment, onReset }: {
  reference: string; amount: number; currency: string; vertical: string;
  fulfillment: "auto" | "manual";
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
        <ShieldCheck className="h-6 w-6 text-success" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-extrabold text-primary">Payment received</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Reference <span className="font-mono font-bold text-foreground">{reference}</span> · {currency} {amount.toLocaleString()} · {vertical}
      </p>
      <p className="mt-4 max-w-md mx-auto text-sm text-muted-foreground">
        {fulfillment === "auto"
          ? "We're issuing your booking with the supplier now. A confirmation email with your ticket/voucher will arrive within minutes."
          : "Your booking is being processed by our operations team and will be confirmed via email shortly."}
      </p>
      <button onClick={onReset} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Make another booking</button>
    </div>
  );
}
