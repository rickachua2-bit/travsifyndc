import { useEffect, useState, type ReactNode } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { getStripePublishableKey } from "@/server/dashboard.functions";

let _stripePromise: Promise<Stripe | null> | null = null;

async function getStripe(): Promise<Stripe | null> {
  if (_stripePromise) return _stripePromise;
  const { key } = await getStripePublishableKey();
  if (!key) return null;
  _stripePromise = loadStripe(key);
  return _stripePromise;
}

export function StripeProvider({ clientSecret, children }: { clientSecret: string; children: ReactNode }) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getStripe().then((s) => { setStripe(s); setLoading(false); });
  }, []);
  if (loading) return <p className="text-sm text-muted-foreground">Loading payment form…</p>;
  if (!stripe) return <p className="text-sm text-destructive">Stripe is not configured.</p>;
  return <Elements stripe={stripe} options={{ clientSecret, appearance: { theme: "stripe" } }}>{children}</Elements>;
}
