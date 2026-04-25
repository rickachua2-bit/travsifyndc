import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Send, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getTicket, replyToTicket, adminUpdateTicketStatus } from "@/server/support.functions";

export const Route = createFileRoute("/_authenticated/admin/support/$id")({
  component: AdminSupportThread,
  head: () => ({ meta: [{ title: "Ticket — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "pending" | "resolved" | "closed";
  created_at: string;
  last_message_at: string;
};

type Message = { id: string; body: string; is_staff: boolean; created_at: string };

function statusColor(s: Ticket["status"]) {
  switch (s) {
    case "open": return "bg-accent/10 text-accent border-accent/30";
    case "pending": return "bg-amber-500/10 text-amber-700 border-amber-500/30";
    case "resolved": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    case "closed": return "bg-muted text-muted-foreground border-border";
  }
}

function priorityColor(p: Ticket["priority"]) {
  if (p === "urgent") return "bg-destructive/10 text-destructive border-destructive/30";
  if (p === "high") return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function AdminSupportThread() {
  const { id } = Route.useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<{ email: string | null; legal_name: string | null; company: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getTicket({ data: { ticketId: id } });
      setTicket(res.ticket as Ticket);
      setMessages(res.messages as Message[]);
      setPartner(res.partner);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (reply.trim().length < 1) return;
    setSending(true);
    try {
      await replyToTicket({ data: { ticketId: id, body: reply } });
      setReply("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: Ticket["status"]) {
    setUpdating(true);
    try {
      await adminUpdateTicketStatus({ data: { ticketId: id, status } });
      toast.success(`Marked as ${status}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Ticket not found.</p>
        <Link to="/admin/support" className="mt-4 inline-block text-sm font-semibold text-accent">Back to tickets</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link to="/admin/support" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <div className="mt-4 rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{ticket.subject}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              #{ticket.id.slice(0, 8)} · {ticket.category} · opened {new Date(ticket.created_at).toLocaleString()}
            </p>
            {partner && (
              <p className="mt-2 text-sm text-foreground">
                <span className="font-medium">{partner.legal_name || partner.company || "Partner"}</span>{" "}
                {partner.email && <span className="text-muted-foreground">· {partner.email}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={priorityColor(ticket.priority)}>{ticket.priority}</Badge>
            <Badge variant="outline" className={statusColor(ticket.status)}>{ticket.status}</Badge>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status:</Label>
          <Select value={ticket.status} onValueChange={(v) => changeStatus(v as Ticket["status"])} disabled={updating}>
            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending partner</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-2xl border p-4 ${m.is_staff ? "border-accent/30 bg-accent/5" : "border-border bg-white"}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${m.is_staff ? "text-accent" : "text-muted-foreground"}`}>
                {m.is_staff ? "Travsify support" : partner?.legal_name || partner?.company || "Partner"}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{m.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="mt-4 rounded-2xl border border-border bg-white p-4">
        <Label htmlFor="reply" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reply as Travsify support</Label>
        <Textarea id="reply" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} placeholder="Type your reply…" className="mt-2" />
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={sending || reply.trim().length === 0} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send reply
          </Button>
        </div>
      </form>
    </div>
  );
}
