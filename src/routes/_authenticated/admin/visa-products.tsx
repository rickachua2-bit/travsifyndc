import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Pencil, Trash2, Globe2, ExternalLink, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListVisaProducts,
  adminCreateVisaProduct,
  adminUpdateVisaProduct,
  adminDeleteVisaProduct,
  adminStartSherpaScrape,
  adminGetScrapeRun,
} from "@/server/visa-products.functions";

export const Route = createFileRoute("/_authenticated/admin/visa-products")({
  component: VisaProductsAdmin,
  head: () => ({ meta: [{ title: "Visa products — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Product = {
  id: string;
  nationality: string; nationality_name: string;
  destination: string; destination_name: string;
  visa_type: string; entry_type: string;
  validity_days: number; max_stay_days: number;
  processing_days_min: number; processing_days_max: number;
  base_price: number; retail_price: number; currency: string;
  requirements: string[]; description: string | null;
  sherpa_url: string | null; image_url: string | null;
  is_active: boolean; display_order: number;
};

const blank: Omit<Product, "id"> = {
  nationality: "NG", nationality_name: "Nigeria",
  destination: "AE", destination_name: "United Arab Emirates",
  visa_type: "Tourist", entry_type: "single",
  validity_days: 60, max_stay_days: 30,
  processing_days_min: 2, processing_days_max: 4,
  base_price: 90, retail_price: 135, currency: "USD",
  requirements: [], description: "",
  sherpa_url: "", image_url: "",
  is_active: true, display_order: 0,
};

type ScrapeRun = {
  id: string; status: string;
  total_corridors: number; scraped_count: number; upserted_count: number; failed_count: number;
  errors: Array<{ corridor: string; error: string }>;
  started_at: string; completed_at: string | null;
};

function VisaProductsAdmin() {
  const list = useServerFn(adminListVisaProducts);
  const create = useServerFn(adminCreateVisaProduct);
  const update = useServerFn(adminUpdateVisaProduct);
  const remove = useServerFn(adminDeleteVisaProduct);
  const startScrape = useServerFn(adminStartSherpaScrape);
  const getRun = useServerFn(adminGetScrapeRun);

  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Omit<Product, "id"> | Product>(blank);
  const [saving, setSaving] = useState(false);
  const [scrape, setScrape] = useState<ScrapeRun | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    setLoading(true);
    const { products } = await list();
    setRows(products as Product[]);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Poll scrape status while a run is active.
  useEffect(() => {
    if (!scrape || scrape.status !== "running") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const { run } = await getRun({ data: { id: scrape.id } });
        setScrape(run as ScrapeRun);
        if ((run as ScrapeRun).status !== "running") {
          await refresh();
          toast.success(`Scrape complete: ${(run as ScrapeRun).upserted_count} products upserted`);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrape?.id, scrape?.status]);

  async function handleStartScrape() {
    if (!confirm("Scrape ~120 corridors from Sherpa? Takes ~3 minutes.")) return;
    setScrapeLoading(true);
    try {
      const r = await startScrape();
      const { run } = await getRun({ data: { id: r.run_id } });
      setScrape(run as ScrapeRun);
      toast.message(r.already_running ? "A scrape is already running — attached to it." : `Started: ${r.total_corridors} corridors queued`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setScrapeLoading(false); }
  }

  function startNew() { setEditing(null); setDraft({ ...blank }); }
  function startEdit(p: Product) { setEditing(p); setDraft({ ...p, requirements: [...p.requirements] }); }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...draft,
        requirements: (draft.requirements || []).filter((r) => r.trim().length > 0),
        description: draft.description || null,
        sherpa_url: draft.sherpa_url || null,
        image_url: draft.image_url || null,
      };
      if (editing) {
        await update({ data: { id: editing.id, patch: payload } });
        toast.success("Visa product updated");
      } else {
        await create({ data: payload });
        toast.success("Visa product created");
      }
      setDraft(blank); setEditing(null);
      await refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this visa product? This cannot be undone.")) return;
    try { await remove({ data: { id } }); toast.success("Deleted"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const scrapePct = scrape && scrape.total_corridors > 0
    ? Math.round((scrape.scraped_count + scrape.failed_count) * 100 / scrape.total_corridors) : 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Catalogue</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Visa products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Curated corridors with retail prices, requirements, and Sherpa portal links for ops.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleStartScrape}
            disabled={scrapeLoading || scrape?.status === "running"}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
            title="Scrape ~120 high-demand corridors from Sherpa and upsert into the catalogue"
          >
            {scrape?.status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {scrape?.status === "running" ? "Scraping…" : "Scrape from Sherpa"}
          </button>
          <button onClick={startNew} className="btn-glow inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"><Plus className="h-4 w-4" /> New product</button>
        </div>
      </div>

      {scrape && (
        <div className="mt-4 rounded-xl border border-border bg-white p-4" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {scrape.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
              {scrape.status === "completed" && <CheckCircle2 className="h-4 w-4 text-success" />}
              {scrape.status === "failed" && <AlertTriangle className="h-4 w-4 text-destructive" />}
              Sherpa scrape — {scrape.status}
            </div>
            <div className="text-xs text-muted-foreground">
              {scrape.scraped_count + scrape.failed_count} / {scrape.total_corridors} corridors · {scrape.upserted_count} products upserted · {scrape.failed_count} failed
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-accent transition-all" style={{ width: `${scrapePct}%` }} />
          </div>
          {scrape.errors.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{scrape.errors.length} error(s) — show details</summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                {scrape.errors.slice(-30).map((e, i) => (
                  <li key={i} className="font-mono text-destructive"><span className="text-muted-foreground">{e.corridor}:</span> {e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}


      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Corridor</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Base / Retail</th>
                  <th className="px-4 py-3 text-left font-semibold">Margin</th>
                  <th className="px-4 py-3 text-left font-semibold">Active</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-surface/50">
                    <td className="px-4 py-3 text-foreground"><span className="inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5 text-muted-foreground" /> {p.nationality_name} → {p.destination_name}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.visa_type} · {p.entry_type}</td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">{p.currency} {Number(p.base_price).toFixed(0)} → {Number(p.retail_price).toFixed(0)}</td>
                    <td className="px-4 py-3 font-semibold text-success">{p.currency} {(Number(p.retail_price) - Number(p.base_price)).toFixed(0)}</td>
                    <td className="px-4 py-3">{p.is_active ? <span className="inline-flex rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">Live</span> : <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Off</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {p.sherpa_url && <a href={p.sherpa_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-accent" title="Open Sherpa portal"><ExternalLink className="h-3.5 w-3.5" /></a>}
                        <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="inline-flex items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="space-y-3 rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <h3 className="font-display text-base font-bold text-primary">{editing ? "Edit product" : "New product"}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Inp label="Nat. ISO" v={draft.nationality} on={(v) => setDraft({ ...draft, nationality: v.toUpperCase().slice(0, 2) })} />
            <Inp label="Nat. name" v={draft.nationality_name} on={(v) => setDraft({ ...draft, nationality_name: v })} />
            <Inp label="Dest. ISO" v={draft.destination} on={(v) => setDraft({ ...draft, destination: v.toUpperCase().slice(0, 2) })} />
            <Inp label="Dest. name" v={draft.destination_name} on={(v) => setDraft({ ...draft, destination_name: v })} />
            <Inp label="Visa type" v={draft.visa_type} on={(v) => setDraft({ ...draft, visa_type: v })} />
            <Sel label="Entry" v={draft.entry_type} opts={["single", "multiple"]} on={(v) => setDraft({ ...draft, entry_type: v })} />
            <Inp label="Validity (days)" v={String(draft.validity_days)} type="number" on={(v) => setDraft({ ...draft, validity_days: Number(v) })} />
            <Inp label="Max stay (days)" v={String(draft.max_stay_days)} type="number" on={(v) => setDraft({ ...draft, max_stay_days: Number(v) })} />
            <Inp label="Proc. min (days)" v={String(draft.processing_days_min)} type="number" on={(v) => setDraft({ ...draft, processing_days_min: Number(v) })} />
            <Inp label="Proc. max (days)" v={String(draft.processing_days_max)} type="number" on={(v) => setDraft({ ...draft, processing_days_max: Number(v) })} />
            <Inp label="Base price" v={String(draft.base_price)} type="number" on={(v) => setDraft({ ...draft, base_price: Number(v) })} />
            <Inp label="Retail price" v={String(draft.retail_price)} type="number" on={(v) => setDraft({ ...draft, retail_price: Number(v) })} />
            <Inp label="Currency" v={draft.currency} on={(v) => setDraft({ ...draft, currency: v.toUpperCase().slice(0, 3) })} />
            <Inp label="Display order" v={String(draft.display_order)} type="number" on={(v) => setDraft({ ...draft, display_order: Number(v) })} />
          </div>
          <Inp label="Description" v={draft.description ?? ""} on={(v) => setDraft({ ...draft, description: v })} />
          <Inp label="Sherpa portal URL (with affiliate=pickpadi)" v={draft.sherpa_url ?? ""} on={(v) => setDraft({ ...draft, sherpa_url: v })} />
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requirements (one per line)</label>
            <textarea
              value={(draft.requirements || []).join("\n")}
              onChange={(e) => setDraft({ ...draft, requirements: e.target.value.split("\n") })}
              rows={5}
              className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Active</label>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="btn-glow flex-1 rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground disabled:opacity-50">{saving ? "Saving…" : editing ? "Update" : "Create"}</button>
            {editing && <button onClick={() => { setEditing(null); setDraft(blank); }} className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Cancel</button>}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Inp({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input type={type} value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
    </label>
  );
}
function Sel({ label, v, opts, on }: { label: string; v: string; opts: string[]; on: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <select value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs">
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
