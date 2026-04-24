import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock, History, Building2, MapPin, Phone, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/applications/$id")({
  component: AdminApplicationDetail,
  head: () => ({ meta: [{ title: "Application — Admin" }, { name: "robots", content: "noindex" }] }),
});

type Profile = Record<string, any>;
type AuditEntry = { id: string; action: string; from_status: string | null; to_status: string | null; reason: string | null; actor_id: string | null; created_at: string };

function AdminApplicationDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("kyc_audit_log").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    ]);
    setProfile(p);
    setAudit((a ?? []) as AuditEntry[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function startReview() {
    setWorking(true);
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: "under_review", kyc_reviewed_by: user?.id })
      .eq("id", id);
    setWorking(false);
    if (error) toast.error(error.message);
    else { toast.success("Marked as under review"); load(); }
  }

  async function approve() {
    setWorking(true);
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: "approved", kyc_reviewed_by: user?.id, kyc_reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", id);
    setWorking(false);
    if (error) toast.error(error.message);
    else { toast.success("Application approved — live key issued"); load(); }
  }

  async function reject() {
    if (reason.trim().length < 10) {
      toast.error("Please provide a reason (at least 10 characters)");
      return;
    }
    setWorking(true);
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: "rejected", kyc_reviewed_by: user?.id, kyc_reviewed_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", id);
    setWorking(false);
    if (error) toast.error(error.message);
    else { toast.success("Application rejected"); setShowReject(false); setReason(""); load(); }
  }

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>;
  }
  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-muted-foreground">Application not found.</p>
        <Link to="/admin" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
      </main>
    );
  }

  const status = profile.kyc_status as string;
  const addr = profile.business_address ?? {};

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <button onClick={() => navigate({ to: "/admin" })} className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
      </button>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Application</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">{profile.legal_name ?? profile.company ?? "—"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {profile.kyc_submitted_at ? new Date(profile.kyc_submitted_at).toLocaleString() : "—"}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Section icon={<Building2 className="h-4 w-4" />} title="Company basics">
            <Row k="Legal name" v={profile.legal_name} />
            <Row k="Trading name" v={profile.trading_name} />
            <Row k="Registration #" v={profile.registration_number} />
            <Row k="Incorporation country" v={profile.incorporation_country} />
            <Row k="Business type" v={profile.business_type} />
            <Row k="Website" v={profile.website} link />
          </Section>

          <Section icon={<MapPin className="h-4 w-4" />} title="Business address">
            <Row k="Street" v={addr.street} />
            <Row k="City" v={addr.city} />
            <Row k="State" v={addr.state} />
            <Row k="Postal" v={addr.postal} />
            <Row k="Country" v={addr.country} />
          </Section>

          <Section icon={<Phone className="h-4 w-4" />} title="Primary contact">
            <Row k="Name" v={profile.full_name} />
            <Row k="Role" v={profile.contact_role} />
            <Row k="Phone" v={profile.contact_phone} />
          </Section>

          <Section icon={<Target className="h-4 w-4" />} title="Use case">
            <Row k="Verticals" v={(profile.target_verticals ?? []).join(", ") || "—"} />
            <Row k="Volume" v={profile.monthly_volume} />
            <Row k="Use case" v={profile.use_case} />
          </Section>

          {profile.rejection_reason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold text-destructive">Last rejection reason</p>
              <p className="mt-1 text-foreground">{profile.rejection_reason}</p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h3 className="font-display text-base font-bold text-primary">Decision</h3>
            <div className="mt-4 flex flex-col gap-2">
              {status === "submitted" && (
                <button disabled={working} onClick={startReview} className="inline-flex items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/5 px-4 py-2.5 text-sm font-semibold text-accent disabled:opacity-60">
                  <Clock className="h-4 w-4" /> Mark under review
                </button>
              )}
              {(status === "submitted" || status === "under_review" || status === "rejected") && (
                <button disabled={working} onClick={approve} className="inline-flex items-center justify-center gap-2 rounded-md bg-success px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ boxShadow: "var(--shadow-accent)" }}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
              )}
              {(status === "submitted" || status === "under_review" || status === "approved") && (
                <button disabled={working} onClick={() => setShowReject(true)} className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/40 bg-white px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-primary"><History className="h-4 w-4" /> Audit log</h3>
            <ol className="mt-4 space-y-3 text-xs">
              {audit.length === 0 && <li className="text-muted-foreground">No history yet.</li>}
              {audit.map((a) => (
                <li key={a.id} className="border-l-2 border-accent/30 pl-3">
                  <div className="font-semibold text-foreground capitalize">{a.action.replace("_", " ")}</div>
                  <div className="text-muted-foreground">
                    {a.from_status && <>{a.from_status} → </>}{a.to_status}
                  </div>
                  {a.reason && <div className="mt-1 italic text-muted-foreground">"{a.reason}"</div>}
                  <div className="mt-1 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowReject(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()} style={{ boxShadow: "var(--shadow-elegant)" }}>
            <h2 className="font-display text-lg font-bold text-primary">Reject application</h2>
            <p className="mt-1 text-sm text-muted-foreground">This reason will be shown to the applicant. Be specific so they know what to fix.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              maxLength={600}
              placeholder="e.g. Registration number couldn't be verified against the CAC registry. Please provide a current Certificate of Incorporation."
              className="mt-4 w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setShowReject(false)} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground">Cancel</button>
              <button disabled={working} onClick={reject} className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-primary">{icon} {title}</h3>
      <dl className="mt-4 grid gap-2 text-sm">{children}</dl>
    </section>
  );
}

function Row({ k, v, link }: { k: string; v?: string | null; link?: boolean }) {
  const value = v && v.length > 0 ? v : "—";
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="break-words text-foreground">
        {link && v ? <a href={v} target="_blank" rel="noreferrer" className="text-accent hover:underline">{value}</a> : value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    submitted: { label: "Submitted", cls: "bg-accent/15 text-accent" },
    under_review: { label: "Under review", cls: "bg-blue-500/15 text-blue-600" },
    approved: { label: "Approved", cls: "bg-success/15 text-success" },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? map.draft;
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${m.cls}`}>{m.label}</span>;
}
