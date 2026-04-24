import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function UsdTopUpForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    setBusy(false);
    if (error) { toast.error(error.message || "Payment failed"); return; }
    if (paymentIntent?.status === "succeeded") {
      toast.success("Payment succeeded — wallet credit lands shortly.");
      onDone();
    } else {
      toast.message(`Payment ${paymentIntent?.status}`);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      <button type="submit" disabled={busy || !stripe} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50">
        {busy && <Loader2 className="h-3 w-3 animate-spin" />} Pay now
      </button>
    </form>
  );
}
