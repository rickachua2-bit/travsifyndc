import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, MessageSquare, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminListTickets } from "@/server/support.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: AdminSupportList,
  head: () => ({ meta: [{ title: "Support — Admin" }, { name: "robots", content: "noindex" }] }),
});

type AdminTicket = {
  id: string;
  subject: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "pending" | "resolved" | "closed";
  last_message_at: string;
  created_at: string;
  user_id: string;
  partner_label: string;
};

function statusColor(s: AdminTicket["status"]) {
  switch (s) {
    case "open": return "bg-accent/10 text-accent border-accent/30";
    case "pending": return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    case "resolved": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    case "closed": return "bg-muted text-muted-foreground border-border";
  }
}

function priorityColor(p: AdminTicket["priority"]) {
  if (p === "urgent") return "bg-destructive/10 text-destructive border-destructive/30";
  if (p === "high") return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function AdminSupportList() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "pending" | "resolved" | "closed">("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await adminListTickets();
      setTickets(res.tickets as AdminTicket[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tickets.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!t.subject.toLowerCase().includes(s) && !t.partner_label.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    pending: tickets.filter((t) => t.status === "pending").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Help center</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Support tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">All partner tickets across Travsify NDC.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["all", "open", "pending", "resolved", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
              filter === f ? "border-accent bg-accent text-accent-foreground" : "border-border bg-white text-foreground hover:border-accent/40"
            }`}
          >
            {f} {f !== "all" && <span className="ml-1 opacity-70">({counts[f]})</span>}
          </button>
        ))}
        <input
          placeholder="Search subject or partner…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ml-auto w-64 rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No tickets match.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last activity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-foreground">{t.subject}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.partner_label}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{t.category}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={priorityColor(t.priority)}>{t.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className={statusColor(t.status)}>{t.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/admin/support/$id" params={{ id: t.id }} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
