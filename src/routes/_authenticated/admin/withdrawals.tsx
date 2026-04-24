import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { adminListWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal, adminMarkWithdrawalPaid } from "@/server/dashboard.functions";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: AdminWithdrawals,
  head: () => ({ meta: [{ title: "Withdrawals — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string; user_id: string; currency: string; amount: number; fee: number; net_amount: number;
  status: string; provider: string | null; created_at: string;
  profile: { full_name: string | null; legal_name: string | null; company: string | null } | null;
  bank: { account_name: string; account_number: string; bank_name: string | null; bank_code: string | null } | null;
};

const STATUSES = ["pending", "approved", "processing", "paid", "rejected", "failed"] as const;

function AdminWithdrawals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("pending");

  async function refresh() {
    setLoading(true);
    try { setRows(await adminListWithdrawals({ data: { status: filter } }) as Row[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function approve(id: string) {
    try { await adminApproveWithdrawal({ data: { id } }); toast.success("Approved"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function reject(id: string) {
    const reason = window.prompt("Reason for rejection?");
    if (!reason) return;
    try { await adminRejectWithdrawal({ data: { id, reason } }); toast.success("Rejected & wallet refunded"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function markPaid(id: string) {
    const ref = window.prompt("Provider reference (optional)") || undefined;
    try { await adminMarkWithdrawalPaid({ data: { id, provider_reference: ref } }); toast.success("Marked paid"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Treasury</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Withdrawal queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">NGN payouts auto-execute via Fincra. USD payouts are manual wires — mark paid after the SWIFT transfer.</p>

      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s}</button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No withdrawals {filter}.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Bank</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-surface/50">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3"><div className="font-semibold">{r.profile?.legal_name || r.profile?.company || "—"}</div><div className="text-xs text-muted-foreground">{r.profile?.full_name}</div></td>
                  <td className="px-4 py-3 text-xs"><div className="font-semibold">{r.bank?.bank_name || "—"}</div><div className="font-mono">{r.bank?.account_number}</div><div className="text-muted-foreground">{r.bank?.account_name}{r.bank?.bank_code ? ` · ${r.bank.bank_code}` : ""}</div></td>
                  <td className="px-4 py-3 text-right font-semibold">{r.currency} {Number(r.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.currency} {Number(r.net_amount).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{r.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => approve(r.id)} className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 py-1 text-[11px] font-semibold text-white"><CheckCircle2 className="h-3 w-3" /> Approve</button>
                          <button onClick={() => reject(r.id)} className="inline-flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-[11px] font-semibold text-white"><XCircle className="h-3 w-3" /> Reject</button>
                        </>
                      )}
                      {r.status === "approved" && r.currency === "USD" && (
                        <button onClick={() => markPaid(r.id)} className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground"><Banknote className="h-3 w-3" /> Mark paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
