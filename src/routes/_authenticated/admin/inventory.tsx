import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Loader2, 
  Search, 
  Globe, 
  Map as MapIcon, 
  Car, 
  ShieldCheck, 
  FileBadge,
  Eye,
  RefreshCw,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { adminListInventory } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Inventory Management — Admin" }] }),
});

type Vertical = "tours" | "transfers" | "rentals" | "insurance" | "visas";

const VERTICALS = [
  { id: "tours" as Vertical, label: "Tours & Experiences", icon: MapIcon, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "transfers" as Vertical, label: "Car Transfers", icon: Car, color: "text-purple-500", bg: "bg-purple-50" },
  { id: "rentals" as Vertical, label: "Car Rentals", icon: Car, color: "text-orange-500", bg: "bg-orange-50" },
  { id: "insurance" as Vertical, label: "Travel Insurance", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "visas" as Vertical, label: "eVisas", icon: FileBadge, color: "text-rose-500", bg: "bg-rose-50" },
];

function InventoryPage() {
  const [activeVertical, setActiveVertical] = useState<Vertical>("tours");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [viewingRow, setViewingRow] = useState<any | null>(null);

  async function fetchInventory() {
    setLoading(true);
    try {
      const res = await adminListInventory({ 
        data: { vertical: activeVertical, q: query || undefined, limit: 100 } 
      });
      setRows(res.rows);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventory();
  }, [activeVertical]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Inventory</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary flex items-center gap-2">
            <Database className="h-8 w-8 text-accent" />
            Global Inventory Catalog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and verify all synced travel data populated by the sync engines.
          </p>
        </div>
        <button 
          onClick={fetchInventory}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
        {VERTICALS.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveVertical(v.id)}
            className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition-all ${
              activeVertical === v.id 
                ? "border-accent bg-accent/5 ring-1 ring-accent" 
                : "border-border bg-white hover:border-accent/50 hover:bg-surface"
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${v.bg} ${v.color}`}>
              <v.icon className="h-6 w-6" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${activeVertical === v.id ? "text-accent" : "text-muted-foreground"}`}>
              {v.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="border-b border-border bg-surface px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder={`Search ${activeVertical}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-white pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </form>
          <div className="text-xs text-muted-foreground font-medium">
            Showing {rows.length} records in {activeVertical}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Database className="h-10 w-10 opacity-20" />
              <p>No inventory records found for this vertical.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-surface border-b border-border text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Title / Name</th>
                  <th className="px-6 py-4">Location / Country</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-primary max-w-[250px] truncate" title={row.title || row.vehicle_name || row.name}>
                        {row.title || row.vehicle_name || row.name}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">
                        ID: {row.original_id || row.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5 capitalize">
                        <Globe className="h-3 w-3" />
                        {row.country || "Global"}
                      </div>
                      <div className="text-[11px] mt-0.5 truncate max-w-[200px]">{row.location || row.pickup_address || "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-foreground">
                        {row.price_currency || row.currency || "USD"} {Number(row.price_amount || row.price || row.daily_rate || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-primary border border-border">
                        {row.provider || "System"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setViewingRow(row)}
                        className="inline-flex items-center gap-1.5 rounded-md p-2 text-muted-foreground hover:bg-surface hover:text-accent transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-primary">Record Details</h2>
                <p className="text-sm text-muted-foreground">Detailed view of the synced inventory record.</p>
              </div>
              <button onClick={() => setViewingRow(null)} className="rounded-full p-2 hover:bg-surface">
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(viewingRow).map(([key, value]) => (
                <div key={key} className="col-span-full sm:col-span-1 p-3 rounded-lg bg-surface/50 border border-border/50">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{key.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-primary font-medium break-words">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '—')}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setViewingRow(null)}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
