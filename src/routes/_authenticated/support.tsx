import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, MessageSquare, Send, ArrowLeft, AlertCircle } from "lucide-react";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listMyTickets, createTicket, getTicket, replyToTicket } from "@/server/support.functions";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support — Travsify NDC" }, { name: "robots", content: "noindex" }] }),
});

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "pending" | "resolved" | "closed";
  last_message_at: string;
  created_at: string;
};

type Message = {
  id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
};

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

function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listMyTickets();
      setTickets(res.tickets as Ticket[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PartnerShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Help center</div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Support tickets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reach our team for technical issues, billing questions, or fulfillment escalations.
            </p>
          </div>
          {!selectedId && !creating && (
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          )}
        </div>

        <div className="mt-8">
          {creating ? (
            <NewTicketForm
              onCancel={() => setCreating(false)}
              onCreated={(id) => { setCreating(false); setSelectedId(id); refresh(); }}
            />
          ) : selectedId ? (
            <TicketThread
              ticketId={selectedId}
              onBack={() => { setSelectedId(null); refresh(); }}
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState onNew={() => setCreating(true)} />
          ) : (
            <TicketList tickets={tickets} onOpen={setSelectedId} />
          )}
        </div>
      </div>
    </PartnerShell>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
      <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 text-base font-semibold text-foreground">No tickets yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">Open your first ticket and we'll get back within one business day.</p>
      <Button onClick={onNew} className="mt-5 gap-2"><Plus className="h-4 w-4" /> New ticket</Button>
    </div>
  );
}

function TicketList({ tickets, onOpen }: { tickets: Ticket[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Subject</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((t) => (
            <tr key={t.id} className="cursor-pointer hover:bg-surface" onClick={() => onOpen(t.id)}>
              <td className="px-4 py-3 font-medium text-foreground">{t.subject}</td>
              <td className="px-4 py-3 capitalize text-muted-foreground">{t.category}</td>
              <td className="px-4 py-3"><Badge variant="outline" className={priorityColor(t.priority)}>{t.priority}</Badge></td>
              <td className="px-4 py-3"><Badge variant="outline" className={statusColor(t.status)}>{t.status}</Badge></td>
              <td className="px-4 py-3 text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewTicketForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3) return toast.error("Subject is too short");
    if (body.trim().length < 5) return toast.error("Please describe your issue");
    setSubmitting(true);
    try {
      const res = await createTicket({ data: { subject, category, priority, body } });
      toast.success("Ticket submitted");
      onCreated(res.ticket.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-foreground">Open a new ticket</h2>
      <p className="mt-1 text-sm text-muted-foreground">We typically respond within one business day.</p>

      <div className="mt-6 grid gap-4">
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="e.g. Flight booking stuck in processing" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="api">API / integration</SelectItem>
                <SelectItem value="bookings">Bookings & fulfillment</SelectItem>
                <SelectItem value="wallet">Wallet & payments</SelectItem>
                <SelectItem value="kyc">KYC & onboarding</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="bug">Bug report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="body">Describe your issue</Label>
          <Textarea id="body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder="Include booking references, API request IDs, and steps to reproduce." />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit ticket
        </Button>
      </div>
    </form>
  );
}

function TicketThread({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getTicket({ data: { ticketId } });
      setTicket(res.ticket as Ticket);
      setMessages(res.messages as Message[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (reply.trim().length < 1) return;
    setSending(true);
    try {
      await replyToTicket({ data: { ticketId, body: reply } });
      setReply("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (!ticket) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Ticket not found.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">Back</Button>
      </div>
    );
  }

  const closed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </button>

      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{ticket.subject}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Opened {new Date(ticket.created_at).toLocaleString()} · #{ticket.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={priorityColor(ticket.priority)}>{ticket.priority}</Badge>
            <Badge variant="outline" className={statusColor(ticket.status)}>{ticket.status}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-2xl border p-4 ${m.is_staff ? "border-accent/30 bg-accent/5" : "border-border bg-white"}`}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${m.is_staff ? "text-accent" : "text-muted-foreground"}`}>
                {m.is_staff ? "Travsify support" : "You"}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{m.body}</p>
          </div>
        ))}
      </div>

      {closed ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-4 text-center text-sm text-muted-foreground">
          This ticket is {ticket.status}. Open a new ticket if you need further help.
        </div>
      ) : (
        <form onSubmit={send} className="rounded-2xl border border-border bg-white p-4">
          <Label htmlFor="reply" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reply</Label>
          <Textarea id="reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} placeholder="Type your message…" className="mt-2" />
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={sending || reply.trim().length === 0} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send reply
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
