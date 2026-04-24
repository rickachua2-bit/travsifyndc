import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { confirmCardLink } from "@/server/dashboard.functions";
import { Loader2 } from "lucide-react";

export function CardLinkForm({ setupIntentId, onDone }: { setupIntentId: string; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (error) { toast.error(error.message || "Card link failed"); setBusy(false); return; }
    try {
      const r = await confirmCardLink({ data: { setup_intent_id: setupIntentId } });
      toast.success(`${r.brand?.toUpperCase()} •••• ${r.last4} linked`);
      onDone();
    } catch (e2) {
      toast.error((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      <button type="submit" disabled={busy || !stripe} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50">
        {busy && <Loader2 className="h-3 w-3 animate-spin" />} Save card
      </button>
    </form>
  );
}
