import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, Mail, Inbox } from "lucide-react";
import { toast } from "sonner";
import { adminListContactSubmissions } from "@/server/admin-ops.functions";

export const Route = createFileRoute("/_authenticated/admin/contact-submissions")({
  component: AdminContact,
  head: () => ({ meta: [{ title: "Contact inbox — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Sub = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  inquiry_type: string;
  message: string;
  user_id: string | null;
  created_at: string;
};

const TYPES = ["all", "general", "sales", "support", "partnership", "press"] as const;

function AdminContact() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    try { setRows(((await adminListContactSubmissions({ data: { inquiry_type: type === "all" ? undefined : type, q: q || undefined } })).submissions) as Sub[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [type]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Inbox</div>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">Contact submissions</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every message sent through the public contact form.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} placeholder="Name, email, company, message…" className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm" />
        </div>
        <button onClick={refresh} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Search</button>
      </div>

      {loading ? (
        <div className="mt-6 flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-white p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No submissions match these filters.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-extrabold text-primary">{r.name}</h3>
                    {r.company && <span className="text-xs text-muted-foreground">· {r.company}</span>}
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">{r.inquiry_type}</span>
                  </div>
                  <a href={`mailto:${r.email}`} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
                    <Mail className="h-3 w-3" /> {r.email}
                  </a>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{r.message}</p>
              <div className="mt-3 flex justify-end">
                <a href={`mailto:${r.email}?subject=Re: your ${r.inquiry_type} inquiry`} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Reply</a>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
