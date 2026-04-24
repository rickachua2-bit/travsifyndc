import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminMarkups, upsertAdminMarkup, deleteAdminMarkup } from "@/server/markups.functions";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/markups")({
  component: AdminMarkupsPage,
  head: () => ({ meta: [{ title: "Travsify markups — Admin" }, { name: "robots", content: "noindex" }] }),
});

const VERTICALS = ["flights", "hotels", "transfers", "tours", "visas", "insurance"] as const;

function AdminMarkupsPage() {
  const list = useServerFn(listAdminMarkups);
  const upsert = useServerFn(upsertAdminMarkup);
  const remove = useServerFn(deleteAdminMarkup);
  return <MarkupEditor scope="travsify" title="Travsify global markup" subtitle="Applied on top of provider base on every booking." list={list} upsert={upsert} remove={remove} />;
}

type Row = { id: string; vertical: string; markup_type: "fixed" | "percentage"; markup_value: number; currency: string | null; is_active: boolean };

export function MarkupEditor({ scope: _scope, title, subtitle, list, upsert, remove }: {
  scope: "travsify" | "partner";
  title: string;
  subtitle: string;
  list: () => Promise<{ markups: Row[] }>;
  upsert: (args: { data: { vertical: string; markup_type: "fixed" | "percentage"; markup_value: number; currency?: string | null; is_active: boolean } }) => Promise<unknown>;
  remove: (args: { data: { id: string } }) => Promise<unknown>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [vertical, setVertical] = useState<string>("flights");
  const [type, setType] = useState<"fixed" | "percentage">("percentage");
  const [value, setValue] = useState("5");
  const [currency, setCurrency] = useState("USD");

  async function refresh() {
    setLoading(true);
    const { markups } = await list();
    setRows(markups);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function handleSave() {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return toast.error("Invalid value");
    if (type === "percentage" && num > 100) return toast.error("Percentage > 100 not allowed");
    try {
      await upsert({ data: { vertical, markup_type: type, markup_value: num, currency: type === "fixed" ? currency : null, is_active: true } });
      toast.success("Saved");
      setValue("5");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function handleDelete(id: string) {
    if (!confirm("Delete this markup?")) return;
    try { await remove({ data: { id } }); toast.success("Deleted"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Pricing</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
        <h2 className="font-display text-base font-bold text-primary">Add or update a rule</h2>
        <p className="text-xs text-muted-foreground">One rule per vertical + type. New saves replace prior matching rule.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <select value={vertical} onChange={(e) => setVertical(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm capitalize">
            {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as "fixed" | "percentage")} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percentage" ? "5" : "10.00"} className="rounded-md border border-border bg-white px-3 py-2 text-sm" />
          {type === "fixed" ? (
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
              <option value="USD">USD</option><option value="NGN">NGN</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </select>
          ) : <span className="px-3 py-2 text-xs text-muted-foreground self-center">% of provider base</span>}
          <button onClick={handleSave} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95">
            <Plus className="h-3.5 w-3.5" /> Save rule
          </button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No markup rules yet — bookings will use 0% markup.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-3 text-left">Vertical</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Value</th><th className="px-4 py-3 text-left">Currency</th><th className="px-4 py-3 text-right">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 capitalize text-foreground">{r.vertical}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{r.markup_type}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{r.markup_type === "percentage" ? `${r.markup_value}%` : Number(r.markup_value).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.currency ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(r.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
