import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Wallet, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { walletCheckout } from "@/server/booking-engine";
import { myWallets } from "@/server/dashboard.functions";
import { ensureArray, getServerFnAuthHeaders } from "@/lib/server-fn-auth";
import type { CheckoutInput } from "@/components/booking/GuestCheckout";

/**
 * Wallet variant of GuestCheckout — same input/output contract, but pays
 * from the signed-in user's wallet instead of Stripe. Shows live balance and
 * blocks the confirm button when insufficient.
 */
export function WalletCheckout({
  input,
  onCancel,
  onSuccess,
}: {
  input: CheckoutInput;
  onCancel: () => void;
  onSuccess: (result: { reference: string; amount: number; currency: string }) => void;
}) {
  const [wallets, setWallets] = useState<Array<{ currency: string; balance: number }> | null>(null);
  const [paying, setPaying] = useState(false);
  const [pricing, setPricing] = useState(true);
  const [breakdown, setBreakdown] = useState<{ provider_base: number; travsify_markup: number; total: number; currency: string } | null>(null);
  const settleCurrency = (input.display_currency || "USD") as "USD" | "NGN";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getServerFnAuthHeaders();
        const list = await myWallets({ headers });
        if (!cancelled) setWallets(ensureArray<{ currency: string; balance: number }>(list));
      } catch (e) {
        if (!cancelled) {
          setWallets([]);
          toast.error(e instanceof Error ? e.message : "Could not load wallet balance");
        }
      } finally {
        if (!cancelled) setPricing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Estimate the total locally using the breakdown returned on actual pay.
  // Until we pay, we show the optimistic supplier base × no markup for affiliate
  // verticals; we display the same number the search results showed.
  const estimateTotal = useMemo(() => {
    if (breakdown) return breakdown.total;
    return input.base_amount; // best-effort estimate
  }, [breakdown, input.base_amount]);

  const balance = useMemo(() => {
    if (!wallets) return null;
    const w = wallets.find((x) => x.currency === settleCurrency);
    return w ? Number(w.balance) : 0;
  }, [wallets, settleCurrency]);

  const insufficient = balance != null && balance < estimateTotal;

  async function pay() {
    setPaying(true);
    try {
      const headers = await getServerFnAuthHeaders();
      const res = await walletCheckout({ data: input, headers });
      setBreakdown(res.price_breakdown);
      toast.success(`Payment confirmed · ${res.reference}`);
      onSuccess({ reference: res.reference, amount: res.amount, currency: res.currency });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete wallet payment");
    } finally {
      setPaying(false);
    }
  }

  if (pricing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-6">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span className="text-sm text-muted-foreground">Loading wallet balance…</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-5">
      <div className="rounded-2xl border border-border bg-white p-5 sm:col-span-3" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-accent" />
          <h3 className="font-display text-base font-bold text-primary">Pay from {settleCurrency} wallet</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Confirmation will be emailed to <span className="font-semibold text-foreground">{input.contact.email}</span>.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-surface/40 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Available balance</span>
            <span className="font-display text-xl font-extrabold text-primary">
              {settleCurrency} {(balance ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">Booking total</span>
            <span className="font-display text-sm font-bold text-foreground">
              {settleCurrency} {estimateTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {insufficient && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 flex-none" />
            <div>
              <div className="font-bold">Insufficient {settleCurrency} balance</div>
              <div className="mt-1 text-destructive/80">
                Top up your wallet to complete this booking.{" "}
                <Link to="/wallet" className="font-bold underline">Go to wallet →</Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold"
          >
            Back
          </button>
          <button
            type="button"
            onClick={pay}
            disabled={paying || insufficient}
            className="btn-glow flex-1 rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50"
            style={{ boxShadow: "var(--shadow-accent)" }}
          >
            {paying ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…</span>
            ) : (
              `Confirm & pay ${settleCurrency} ${estimateTotal.toLocaleString()}`
            )}
          </button>
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-surface/40 p-5 sm:col-span-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your booking</div>
        <div className="mt-1 font-display text-lg font-bold capitalize text-primary">{input.vertical.replace("_", " ")}</div>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Supplier price</dt><dd>{input.currency} {input.base_amount.toLocaleString()}</dd></div>
          {breakdown && breakdown.travsify_markup > 0 && (
            <div className="flex justify-between"><dt className="text-muted-foreground">Service fee</dt><dd>{breakdown.currency} {breakdown.travsify_markup.toLocaleString()}</dd></div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-extrabold text-primary">
            <dt>Total</dt>
            <dd>{settleCurrency} {estimateTotal.toLocaleString()}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          Wallet payment · Instant settlement
        </div>
      </aside>
    </div>
  );
}
