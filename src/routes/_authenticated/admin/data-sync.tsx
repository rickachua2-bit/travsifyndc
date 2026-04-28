import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  RefreshCw, 
  Map, 
  ShieldCheck, 
  Car, 
  FileBadge, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Globe
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/data-sync")({
  component: DataSyncPage,
});

type Vertical = "tours" | "insurance" | "transfers" | "evisas" | "rentals";

const verticals = [
  {
    id: "tours" as Vertical,
    title: "Tours & Experiences",
    provider: "GetYourGuide",
    icon: Map,
    description: "Syncs the latest tour packages and top-rated experiences by country.",
  },
  {
    id: "insurance" as Vertical,
    title: "Travel Insurance",
    provider: "SafetyWing",
    icon: ShieldCheck,
    description: "Syncs current nomad insurance policies and global premium amounts.",
  },
  {
    id: "transfers" as Vertical,
    title: "Car Transfers",
    provider: "Mozio",
    icon: Car,
    description: "Updates available airport transfers and private routes by country.",
  },
  {
    id: "rentals" as Vertical,
    title: "Car Rentals",
    provider: "RentalCars",
    icon: Car,
    description: "Fetches self-drive rental inventory and pricing across entire nations.",
  },
  {
    id: "evisas" as Vertical,
    title: "eVisas",
    provider: "Sherpa",
    icon: FileBadge,
    description: "Fetches latest visa requirements and processing fees for destinations.",
  },
];

function DataSyncPage() {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [lastSynced, setLastSynced] = useState<Record<string, Date | null>>({});
  const [customCountry, setCustomCountry] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedStarted, setSeedStarted] = useState(false);

  const handleSeedGlobal = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/v1/admin/sync/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Global warm-up started for ${data.countries.length} countries!`);
        setSeedStarted(true);
      } else {
        toast.error(`Seed failed: ${data.message}`);
      }
    } catch {
      toast.error("Failed to start global seed.");
    } finally {
      setSeeding(false);
    }
  };

  const handleSync = async (id: string, countries?: string[]) => {
    setSyncing((prev) => ({ ...prev, [id]: true }));
    
    try {
      const endpointMap: Record<string, string> = {
        tours: "/api/v1/admin/sync/tours",
        transfers: "/api/v1/admin/sync/transfers",
        rentals: "/api/v1/admin/sync/rentals",
        insurance: "/api/v1/admin/sync/insurance",
        evisas: "/api/v1/admin/sync/visas"
      };

      const response = await fetch(endpointMap[id], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: countries || [] })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`${verticals.find(v => v.id === id)?.title} synced successfully!`);
        setLastSynced((prev) => ({ ...prev, [id]: new Date() }));
      } else {
        toast.error(`Sync failed: ${data.message}`);
      }
    } catch (error) {
      toast.error("An error occurred during synchronization.");
    } finally {
      setSyncing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAddCountrySync = () => {
    if (!customCountry.trim()) return;
    handleSync("tours", [customCountry]);
    handleSync("transfers", [customCountry]);
    handleSync("rentals", [customCountry]);
    handleSync("evisas", [customCountry]);
    setCustomCountry("");
  };

  const handleSyncAll = async () => {
    verticals.forEach((v) => handleSync(v.id));
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-accent" />
            Data Synchronization
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Manually trigger data crawls to fetch the latest pricing and availability. 
            The system also auto-fetches missing data when users search.
          </p>
        </div>
        <button
          onClick={handleSyncAll}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Sync All Data
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Auto-Fetch a New Country</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter a country name to automatically fetch tours, transfers, rentals, and visa info.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Enter country (e.g. Nigeria)"
            value={customCountry}
            onChange={(e) => setCustomCountry(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button 
            onClick={handleAddCountrySync}
            disabled={Object.values(syncing).some(Boolean) || !customCountry}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-2 text-sm font-bold text-white hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Fetch Country Data
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20">
              <Globe className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Seed Top 50 Countries</h2>
              <p className="text-sm text-muted-foreground">One-click populate tours, transfers, rentals &amp; visas for the 50 highest-traffic destinations worldwide.</p>
            </div>
          </div>
          <button
            onClick={handleSeedGlobal}
            disabled={seeding || seedStarted}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {seeding ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Starting...</>
            ) : seedStarted ? (
              <><CheckCircle2 className="h-4 w-4" /> Warm-up Running</>
            ) : (
              <><Globe className="h-4 w-4" /> Launch Global Warm-up</>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {verticals.map((vertical) => {
          const isSyncing = syncing[vertical.id];
          const syncDate = lastSynced[vertical.id];

          return (
            <div key={vertical.id} className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <vertical.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{vertical.title}</h3>
                      <p className="text-xs font-medium text-muted-foreground">Provider: {vertical.provider}</p>
                    </div>
                  </div>
                  {syncDate ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      No Data
                    </span>
                  )}
                </div>
                
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {vertical.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">
                  {syncDate ? (
                    <span>Updated: {syncDate.toLocaleTimeString()}</span>
                  ) : (
                    <span>Not synced</span>
                  )}
                </div>
                <button
                  onClick={() => handleSync(vertical.id)}
                  disabled={isSyncing}
                  className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
