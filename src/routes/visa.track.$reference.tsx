import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Circle,
  Clock,
  Download,
  FileUp,
  Loader2,
  Mail,
  ShieldCheck,
  Upload,
  XCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  trackVisaApplication,
  requestDocumentUploadUrl,
  registerUploadedDocument,
} from "@/server/visa-applications.functions";
import { PageShell, PageHero } from "@/components/landing/PageShell";

/**
 * Guest-friendly visa tracking + document upload page.
 *
 * Auth model: customer enters their email + the application reference is in
 * the URL. Server fn validates both and returns the application bundle.
 * Once authenticated, they can upload supporting documents to a private
 * Supabase storage bucket via signed URLs and download the issued visa PDF.
 */

const SearchSchema = z.object({
  email: z.string().email().optional(),
});

export const Route = createFileRoute("/visa/track/$reference")({
  component: TrackPage,
  validateSearch: (s) => SearchSchema.parse(s),
  head: ({ params }) => ({
    meta: [
      { title: `Track visa application ${params.reference} · Travsify` },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Track your visa application status, upload supporting documents, and download your issued visa." },
    ],
  }),
});

const STATUS_ORDER = [
  "submitted",
  "documents_pending",
  "documents_verified",
  "sent_to_embassy",
  "approved",
  "delivered",
] as const;

const STATUS_LABEL: Record<string, string> = {
  submitted: "Application submitted",
  documents_pending: "Documents under review",
  documents_verified: "Documents verified",
  sent_to_embassy: "Sent to issuing authority",
  approved: "Visa approved",
  rejected: "Application rejected",
  delivered: "Visa delivered",
  refunded: "Refunded",
  cancelled: "Cancelled",
  draft: "Draft",
};

type Application = {
  id: string;
  reference: string;
  status: string;
  customer_name: string;
  customer_email: string;
  currency: string;
  visa_fee: number;
  service_fee: number;
  total_amount: number;
  refund_amount: number | null;
  refund_reference: string | null;
  rejection_reason: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  embassy_reference: string | null;
};
type Product = {
  destination_name: string;
  visa_type: string;
  processing_days_min: number;
  processing_days_max: number;
  validity_days: number;
  max_stay_days: number;
  entry_type: string;
  requirements: string[] | null;
};
type DocumentRow = {
  id: string;
  document_type: string;
  document_label: string | null;
  file_name: string;
  status: "pending_review" | "approved" | "rejected";
  rejection_reason: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
};
type EventRow = { event_type: string; message: string | null; created_at: string };

function TrackPage() {
  const { reference } = Route.useParams();
  const search = useSearch({ from: "/visa/track/$reference" });
  const [email, setEmail] = useState(search.email ?? "");
  const [authed, setAuthed] = useState(false);

  if (!authed) {
    return (
      <PageShell>
        <PageHero
          eyebrow="Track your application"
          title="Visa application"
          highlight={reference}
          description="Enter the email you used at booking to view status, upload documents, and download your visa."
        />
        <section className="mx-auto max-w-md px-6 py-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.includes("@")) return toast.error("Enter a valid email");
              setAuthed(true);
            }}
            className="space-y-4 rounded-2xl border border-border bg-white p-6"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Booking email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <button className="btn-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-bold text-accent-foreground">
              <Mail className="h-4 w-4" /> View my application
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              We use email + reference as a lightweight check. Want to save all your bookings?{" "}
              <Link to="/signup" className="text-accent hover:underline">Create a free account</Link>.
            </p>
          </form>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TrackedView reference={reference} email={email} onSignOut={() => setAuthed(false)} />
    </PageShell>
  );
}

function TrackedView({ reference, email, onSignOut }: { reference: string; email: string; onSignOut: () => void }) {
  const trackFn = useServerFn(trackVisaApplication);
  const [bundle, setBundle] = useState<{
    application: Application;
    product: Product | null;
    documents: DocumentRow[];
    events: EventRow[];
    visa_pdf_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      const res = await trackFn({ data: { reference, email } });
      setBundle(res as never);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reference, email]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your application…
        </div>
      </div>
    );
  }
  if (error || !bundle) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          <p className="font-semibold">{error ?? "Application not found"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Double-check the reference and email match what you used at booking.</p>
          <button onClick={onSignOut} className="mt-3 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold">Try a different email</button>
        </div>
      </div>
    );
  }

  const app = bundle.application;
  const requiredDocs = inferRequiredDocuments(bundle.product?.requirements ?? []);
  const uploadedTypes = new Set(bundle.documents.map((d) => d.document_type));
  const isClosed = ["delivered", "refunded", "cancelled", "rejected"].includes(app.status);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Visa application</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-primary">
            {bundle.product?.destination_name ?? "Visa"} · {bundle.product?.visa_type ?? "—"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reference <span className="font-mono font-bold text-foreground">{app.reference}</span>
            {" · "}
            <span className="capitalize">{STATUS_LABEL[app.status] ?? app.status}</span>
          </p>
        </div>
        <button onClick={refresh} className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-accent">
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Status banners */}
          {app.status === "rejected" && (
            <Banner tone="destructive" icon={<XCircle className="h-5 w-5" />} title="Application rejected by the issuing authority">
              {app.rejection_reason || "The issuing authority did not approve this application."}
              <p className="mt-1 text-xs">A refund of the visa fee ({app.currency} {Number(app.visa_fee).toFixed(2)}) is being processed. The service fee is non-refundable as disclosed at checkout.</p>
            </Banner>
          )}
          {app.status === "refunded" && (
            <Banner tone="muted" icon={<CheckCircle2 className="h-5 w-5" />} title="Refund processed">
              {app.currency} {Number(app.refund_amount ?? 0).toFixed(2)} refunded · ref {app.refund_reference ?? "—"}
            </Banner>
          )}
          {app.status === "delivered" && bundle.visa_pdf_url && (
            <Banner tone="success" icon={<ShieldCheck className="h-5 w-5" />} title="Your visa is ready">
              Download the PDF below and present it at the border or check-in.
              <a
                href={bundle.visa_pdf_url}
                target="_blank"
                rel="noreferrer"
                className="btn-glow mt-3 inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-xs font-bold text-white"
              >
                <Download className="h-3.5 w-3.5" /> Download visa PDF
              </a>
            </Banner>
          )}

          {/* Status timeline */}
          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-base font-bold text-primary">Status</h2>
            <ol className="mt-4 space-y-3">
              {STATUS_ORDER.map((s) => {
                const reachedIdx = STATUS_ORDER.indexOf(app.status as typeof STATUS_ORDER[number]);
                const thisIdx = STATUS_ORDER.indexOf(s);
                const isReached = reachedIdx >= thisIdx;
                const isCurrent = app.status === s;
                return (
                  <li key={s} className="flex items-start gap-3">
                    {isReached ? (
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 ${isCurrent ? "text-accent" : "text-success"}`} />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/40" />
                    )}
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${isReached ? "text-foreground" : "text-muted-foreground"}`}>
                        {STATUS_LABEL[s]} {isCurrent && <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">Current</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Document upload */}
          {!isClosed && (
            <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
              <h2 className="font-display text-base font-bold text-primary">Supporting documents</h2>
              <p className="mt-1 text-xs text-muted-foreground">Upload clear scans or photos. Accepted: PDF, JPG, PNG, WEBP, HEIC. Max 15MB each.</p>

              <div className="mt-4 space-y-3">
                {requiredDocs.map((doc) => {
                  const uploaded = bundle.documents.filter((d) => d.document_type === doc.type);
                  const hasApproved = uploaded.some((d) => d.status === "approved");
                  return (
                    <div key={doc.type} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{doc.label}</div>
                          {doc.hint && <div className="text-[11px] text-muted-foreground">{doc.hint}</div>}
                        </div>
                        {hasApproved ? (
                          <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success"><CheckCircle2 className="h-3 w-3" /> Approved</span>
                        ) : uploadedTypes.has(doc.type) ? (
                          <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">Pending review</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Required</span>
                        )}
                      </div>

                      {/* Uploaded files for this doc */}
                      {uploaded.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {uploaded.map((d) => (
                            <li key={d.id} className="flex items-center justify-between gap-2 rounded border border-border bg-surface/50 px-2 py-1 text-xs">
                              <span className="flex items-center gap-1.5 truncate"><FileText className="h-3 w-3 text-muted-foreground" /> {d.file_name}</span>
                              <DocStatus s={d.status} reason={d.rejection_reason} />
                            </li>
                          ))}
                        </ul>
                      )}

                      <UploadButton
                        applicationReference={app.reference}
                        email={app.customer_email}
                        documentType={doc.type}
                        documentLabel={doc.label}
                        onDone={refresh}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Events feed */}
          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-base font-bold text-primary">Activity</h2>
            <ol className="mt-3 space-y-3">
              {bundle.events.length === 0 && <li className="text-xs text-muted-foreground">Nothing yet.</li>}
              {bundle.events.map((e, i) => (
                <li key={i} className="flex items-start gap-3 border-l-2 border-border pl-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                    <div className="text-sm text-foreground">{e.message ?? e.event_type}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-3 self-start rounded-2xl border border-border bg-surface/40 p-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Applicant</div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">{app.customer_name}</div>
            <div className="text-xs text-muted-foreground">{app.customer_email}</div>
          </div>
          <hr className="border-border" />
          <div className="space-y-1.5 text-xs">
            <KV k="Visa fee" v={`${app.currency} ${Number(app.visa_fee).toFixed(2)}`} />
            <KV k="Service fee" v={`${app.currency} ${Number(app.service_fee).toFixed(2)}`} />
            <KV k="Total paid" v={`${app.currency} ${Number(app.total_amount).toFixed(2)}`} bold />
            {bundle.product && (
              <>
                <hr className="my-2 border-border" />
                <KV k="Processing time" v={`${bundle.product.processing_days_min}–${bundle.product.processing_days_max} days`} />
                <KV k="Validity" v={`${bundle.product.validity_days} days`} />
                <KV k="Max stay" v={`${bundle.product.max_stay_days} days`} />
                <KV k="Entry" v={bundle.product.entry_type} />
              </>
            )}
            {app.arrival_date && <KV k="Arrival" v={app.arrival_date} />}
            {app.departure_date && <KV k="Departure" v={app.departure_date} />}
          </div>
          <hr className="border-border" />
          <div className="rounded-md bg-white p-3 text-[11px] text-muted-foreground">
            <Clock className="mb-1 inline h-3 w-3" /> Refund policy: visa fee refunded if the issuing authority rejects. Service fee is non-refundable.
          </div>
          <button onClick={onSignOut} className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-accent">
            Sign out of this view
          </button>
        </aside>
      </div>
    </main>
  );
}

function KV({ k, v, bold = false }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-display font-extrabold text-primary" : "font-mono text-foreground"}>{v}</span>
    </div>
  );
}

function DocStatus({ s, reason }: { s: string; reason: string | null }) {
  if (s === "approved") return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> approved</span>;
  if (s === "rejected") return <span className="inline-flex items-center gap-1 text-destructive" title={reason ?? undefined}><XCircle className="h-3 w-3" /> rejected</span>;
  return <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> pending</span>;
}

function Banner({ tone, icon, title, children }: { tone: "success" | "destructive" | "muted"; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const cls = tone === "success" ? "border-success/30 bg-success/5 text-success" : tone === "destructive" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-surface text-foreground";
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 text-sm">
          <div className="font-display text-base font-bold">{title}</div>
          <div className="mt-1 text-foreground/80">{children}</div>
        </div>
      </div>
    </div>
  );
}

function UploadButton({
  applicationReference,
  email,
  documentType,
  documentLabel,
  onDone,
}: {
  applicationReference: string;
  email: string;
  documentType: string;
  documentLabel: string;
  onDone: () => void;
}) {
  const requestUrl = useServerFn(requestDocumentUploadUrl);
  const register = useServerFn(registerUploadedDocument);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large (max 15MB)");
      return;
    }
    setBusy(true);
    try {
      const { upload_url, storage_path } = await requestUrl({
        data: {
          application_reference: applicationReference,
          customer_email: email,
          document_type: documentType,
          document_label: documentLabel,
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        },
      });

      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

      await register({
        data: {
          application_reference: applicationReference,
          customer_email: email,
          storage_path,
          document_type: documentType,
          document_label: documentLabel,
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        },
      });
      toast.success(`${documentLabel} uploaded`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-accent/60 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileUp className="h-3 w-3" />}
        {busy ? "Uploading…" : "Upload file"}
      </button>
    </div>
  );
}

/**
 * Map free-form requirement strings from the visa product into structured
 * document slots. We use prefix matching so admin-entered requirements like
 * "Passport bio page" map cleanly to a `passport` doc type. Unknown items
 * become a generic "supporting" doc slot.
 */
function inferRequiredDocuments(requirements: string[]): { type: string; label: string; hint?: string }[] {
  const docs: { type: string; label: string; hint?: string }[] = [];
  const seen = new Set<string>();

  // Always require these two — the bare minimum for any visa application.
  const baseline = [
    { type: "passport", label: "Passport bio page", hint: "Color scan of the page with your photo and personal details" },
    { type: "photo", label: "Passport-style photo", hint: "Recent (within 6 months), white background, face clearly visible" },
  ];
  for (const b of baseline) {
    docs.push(b);
    seen.add(b.type);
  }

  for (const raw of requirements) {
    const r = raw.toLowerCase();
    let type = "supporting";
    if (r.includes("bank") || r.includes("statement")) type = "bank_statement";
    else if (r.includes("flight") || r.includes("itinerary") || r.includes("ticket")) type = "flight_itinerary";
    else if (r.includes("hotel") || r.includes("accommodation") || r.includes("booking")) type = "accommodation";
    else if (r.includes("invitation")) type = "invitation_letter";
    else if (r.includes("employment") || r.includes("employer") || r.includes("work")) type = "employment_letter";
    else if (r.includes("insurance") || r.includes("cover")) type = "travel_insurance";
    else if (r.includes("photo")) continue; // already covered by baseline
    else if (r.includes("passport")) continue;
    else type = `supporting_${docs.length}`;
    if (seen.has(type)) continue;
    seen.add(type);
    docs.push({ type, label: raw });
  }
  return docs;
}
