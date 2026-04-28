import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { 
  RefreshCw, 
  Map, 
  ShieldCheck, 
  Car, 
  FileBadge, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/data-sync")({
  component: DataSyncPage,
});

type Vertical = "tours" | "insurance" | "transfers" | "evisas";

const verticals = [
  {
    id: "tours" as Vertical,
    title: "Tours & Experiences",
    provider: "GetYourGuide",
    icon: Map,
    description: "Syncs the latest tour packages, pricing, and availability.",
  },
  {
    id: "insurance" as Vertical,
    title: "Travel Insurance",
    provider: "SafetyWing",
    icon: ShieldCheck,
    description: "Syncs current coverage policies and premium amounts.",
  },
  {
    id: "transfers" as Vertical,
    title: "Car Transfers",
    provider: "Mozio",
    icon: Car,
    description: "Updates available routes, vehicle types, and base fares.",
  },
  {
    id: "evisas" as Vertical,
    title: "eVisas",
    provider: "Sherpa",
    icon: FileBadge,
    description: "Fetches latest visa requirements, processing times, and fees.",
  },
];

function DataSyncPage() {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [lastSynced, setLastSynced] = useState<Record<string, Date | null>>({});

  const handleSync = async (id: string) => {
    setSyncing((prev) => ({ ...prev, [id]: true }));
    
    // Simulate a sync process for now. This will be replaced with a real API call to the backend sync engine.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    setLastSynced((prev) => ({ ...prev, [id]: new Date() }));
    setSyncing((prev) => ({ ...prev, [id]: false }));
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
            Manually trigger data crawls to fetch the latest pricing and availability from your affiliate providers. 
            This keeps your database fresh and ensures accurate bookings.
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

      <div className="grid gap-6 md:grid-cols-2">
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
                      Up to date
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Pending sync
                    </span>
                  )}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {vertical.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">
                  {syncDate ? (
                    <span>Last synced: {syncDate.toLocaleTimeString()}</span>
                  ) : (
                    <span>No recent sync</span>
                  )}
                </div>
                <button
                  onClick={() => handleSync(vertical.id)}
                  disabled={isSyncing}
                  className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
