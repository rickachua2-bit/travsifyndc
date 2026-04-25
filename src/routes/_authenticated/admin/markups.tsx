import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminMarkups, upsertAdminMarkup, deleteAdminMarkup } from "@/server/markups.functions";
import { Loader2, Plus, Trash2, Percent, DollarSign, Plane, Hotel, Bus, MapPin, Globe2, Shield, Car } from "lucide-react";
import { toast } from "sonner";
import { getServerFnAuthHeaders } from "@/lib/server-fn-auth";

export const Route = createFileRoute("/_authenticated/admin/markups")({
  component: AdminMarkupsPage,
  head: () => ({ meta: [{ title: "Travsify markups — Admin" }, { name: "robots", content: "noindex" }] }),
});

const VERTICALS = ["flights", "hotels", "transfers", "tours", "visas", "insurance", "car_rentals"] as const;
const VERTICAL_ICON: Record<string, typeof Plane> = {
  flights: Plane, hotels: Hotel, transfers: Bus, tours: MapPin,
  visas: Globe2, insurance: Shield, car_rentals: Car,
};

function AdminMarkupsPage() {
  const list = useServerFn(listAdminMarkups);
  const upsert = useServerFn(upsertAdminMarkup);
  const remove = useServerFn(deleteAdminMarkup);
  return <MarkupEditor scope="travsify" title="Travsify global markup" subtitle="Applied on top of provider base on every booking, across all partners." list={list} upsert={upsert} remove={remove} />;
}

type Row = { id: string; vertical: string; markup_type: "fixed" | "percentage"; markup_value: number; currency: string | null; is_active: boolean };

export function MarkupEditor({ scope, title, subtitle, list, upsert, remove }: {
  scope: "travsify" | "partner";
  title: string;
  subtitle: string;
  list: (args?: { headers?: HeadersInit }) => Promise<{ markups: Row[] }>;
  upsert: (args: { data: never; headers?: HeadersInit }) => Promise<unknown>;
  remove: (args: { data: { id: string }; headers?: HeadersInit }) => Promise<unknown>;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vertical, setVertical] = useState<string>("flights");
  const [type, setType] = useState<"fixed" | "percentage">("percentage");
  const [value, setValue] = useState("5");
  const [currency, setCurrency] = useState("USD");

  async function refresh() {
    setLoading(true);
    try {
      const headers = await getServerFnAuthHeaders();
      const { markups } = await list({ headers });
      setRows(markups);
    } catch (e) {
      toast.error("Failed to load markups: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function handleSave() {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return toast.error("Enter a positive number");
    if (type === "percentage" && num > 100) return toast.error("Percentage can't exceed 100%");
    if (type === "fixed" && num === 0) return toast.error("Fixed markup must be > 0");
    setSaving(true);
    try {
      const headers = await getServerFnAuthHeaders();
      await upsert({ data: { vertical, markup_type: type, markup_value: num, currency: type === "fixed" ? currency : null, is_active: true } as never, headers });
      toast.success("Markup saved");
      setValue(type === "percentage" ? "5" : "10");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete ${label}? Future bookings won't include this markup.`)) return;
    try { const headers = await getServerFnAuthHeaders(); await remove({ data: { id }, headers }); toast.success("Markup deleted"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  // Group rows by vertical for clean display
  const byVertical: Record<string, Row[]> = {};
  for (const r of rows) {
    (byVertical[r.vertical] ||= []).push(r);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Pricing</div>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {scope === "partner" && (
          <p className="mt-2 inline-block rounded-md bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            Your markup is added on top of provider base + Travsify markup, and credited to your wallet on every confirmed booking.
          </p>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
        <h2 className="font-display text-base font-bold text-primary">Add or update a rule</h2>
        <p className="text-xs text-muted-foreground">One rule per (vertical, type{type === "fixed" ? ", currency" : ""}). Saving replaces any prior matching rule.</p>
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vertical</label>
            <select value={vertical} onChange={(e) => setVertical(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm capitalize">
              {VERTICALS.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as "fixed" | "percentage")} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Value</label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percentage" ? "5" : "10.00"}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">{type === "percentage" ? "%" : ""}</span>
            </div>
          </div>
          {type === "fixed" ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm">
                <option value="USD">USD</option><option value="NGN">NGN</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          ) : <div className="hidden sm:block" />}
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Save rule
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-base font-bold text-primary">Active rules</h2>
        {loading ? (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-border bg-white"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            No markup rules yet — bookings will use 0% {scope === "partner" ? "partner" : "Travsify"} markup.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VERTICALS.filter((v) => byVertical[v]?.length).map((v) => {
              const Icon = VERTICAL_ICON[v] ?? Plane;
              return (
                <div key={v} className="rounded-2xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent"><Icon className="h-4 w-4" /></div>
                    <h3 className="font-display text-sm font-bold capitalize text-primary">{v.replace(/_/g, " ")}</h3>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {byVertical[v].map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          {r.markup_type === "percentage"
                            ? <Percent className="h-3 w-3 text-muted-foreground" />
                            : <DollarSign className="h-3 w-3 text-muted-foreground" />}
                          <span className="font-bold text-foreground">
                            {r.markup_type === "percentage" ? `${r.markup_value}%` : `${r.currency} ${Number(r.markup_value).toFixed(2)}`}
                          </span>
                          <span className="text-muted-foreground">{r.markup_type}</span>
                        </div>
                        <button
                          onClick={() => handleDelete(r.id, `${v} ${r.markup_type} ${r.markup_value}`)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete rule"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
