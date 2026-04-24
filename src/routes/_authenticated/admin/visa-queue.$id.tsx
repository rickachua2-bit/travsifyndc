import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, FileText, Upload, Send, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  adminGetVisaApplication,
  adminReviewDocument,
  adminUpdateApplicationStatus,
  adminGetVisaPdfUploadUrl,
  adminFinalizeVisaPdf,
  adminRefundVisaApplication,
} from "@/server/visa-applications.functions";

export const Route = createFileRoute("/_authenticated/admin/visa-queue/$id")({
  component: VisaApplicationDetail,
  head: () => ({ meta: [{ title: "Visa application — Admin" }, { name: "robots", content: "noindex" }] }),
});

function VisaApplicationDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(adminGetVisaApplication);
  const review = useServerFn(adminReviewDocument);
  const updateStatus = useServerFn(adminUpdateApplicationStatus);
  const getPdfUrl = useServerFn(adminGetVisaPdfUploadUrl);
  const finalizePdf = useServerFn(adminFinalizeVisaPdf);
  const refund = useServerFn(adminRefundVisaApplication);

  const [bundle, setBundle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [embassyRef, setEmbassyRef] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const pdfInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try { const res = await get({ data: { application_id: id } }); setBundle(res); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  async function reviewDoc(docId: string, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      reason = prompt("Why is this document being rejected?") ?? undefined;
      if (!reason) return;
    }
    setWorking(true);
    try { await review({ data: { document_id: docId, action, rejection_reason: reason } }); toast.success(`Document ${action}d`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setWorking(false); }
  }

  async function setStatus(status: any, extra: any = {}) {
    setWorking(true);
    try { await updateStatus({ data: { application_id: id, status, ...extra } }); toast.success(`Marked ${status.replace(/_/g, " ")}`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setWorking(false); }
  }

  async function uploadVisaPdf(file: File) {
    setWorking(true);
    try {
      const { upload_url, storage_path } = await getPdfUrl({ data: { application_id: id, file_name: file.name } });
      const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type || "application/pdf", "x-upsert": "false" }, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await finalizePdf({ data: { application_id: id, storage_path } });
      toast.success("Visa PDF delivered to customer");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setWorking(false); if (pdfInputRef.current) pdfInputRef.current.value = ""; }
  }

  async function processRefund() {
    if (!refundReason.trim()) return toast.error("Reason required");
    setWorking(true);
    try { await refund({ data: { application_id: id, reason: refundReason.trim() } }); toast.success("Refund issued (visa fee only)"); setRefundReason(""); refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setWorking(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-16"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>;
  if (!bundle) return <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-muted-foreground">Application not found</div>;

  const app = bundle.application;
  const product = bundle.product;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Link to="/admin/visa-queue" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to queue</Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-primary">{product?.destination_name} · {product?.visa_type}</h1>
          <p className="text-sm text-muted-foreground">Ref <span className="font-mono font-bold text-foreground">{app.reference}</span> · <span className="capitalize">{app.status.replace(/_/g, " ")}</span></p>
        </div>
        {product?.sherpa_url && (
          <a href={product.sherpa_url} target="_blank" rel="noreferrer" className="btn-glow inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">
            <ExternalLink className="h-3 w-3" /> Open Sherpa portal
          </a>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Travelers */}
          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-base font-bold text-primary">Travelers</h2>
            <div className="mt-3 space-y-3">
              {bundle.travelers.map((t: any) => (
                <div key={t.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-semibold text-foreground">{t.full_name} {t.is_primary && <span className="ml-1 text-[10px] font-bold uppercase text-accent">primary</span>}</div>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <div>DOB: <span className="text-foreground">{t.date_of_birth ?? "—"}</span></div>
                    <div>Nat: <span className="text-foreground">{t.nationality ?? "—"}</span></div>
                    <div>Passport: <span className="font-mono text-foreground">{t.passport_number ?? "—"}</span></div>
                    <div>Expiry: <span className="text-foreground">{t.passport_expiry_date ?? "—"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Documents */}
          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-base font-bold text-primary">Documents</h2>
            <div className="mt-3 space-y-2">
              {bundle.documents.length === 0 && <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>}
              {bundle.documents.map((d: any) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate"><FileText className="h-3.5 w-3.5 text-muted-foreground" /> <span className="font-semibold text-foreground">{d.document_label ?? d.document_type}</span></div>
                    <div className="truncate text-[11px] text-muted-foreground">{d.file_name} · {Math.round((d.size_bytes ?? 0) / 1024)}KB</div>
                    {d.rejection_reason && <div className="mt-1 text-[11px] text-destructive">Rejected: {d.rejection_reason}</div>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {d.preview_url && <a href={d.preview_url} target="_blank" rel="noreferrer" className="rounded border border-border bg-white px-2 py-1 text-[11px] font-semibold hover:border-accent">View</a>}
                    {d.status === "pending_review" && (
                      <>
                        <button disabled={working} onClick={() => reviewDoc(d.id, "approve")} className="inline-flex items-center gap-1 rounded bg-success px-2 py-1 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-50"><CheckCircle2 className="h-3 w-3" /> Approve</button>
                        <button disabled={working} onClick={() => reviewDoc(d.id, "reject")} className="inline-flex items-center gap-1 rounded border border-destructive bg-white px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive hover:text-white disabled:opacity-50"><XCircle className="h-3 w-3" /> Reject</button>
                      </>
                    )}
                    {d.status === "approved" && <span className="rounded bg-success/10 px-2 py-1 text-[10px] font-bold uppercase text-success">Approved</span>}
                    {d.status === "rejected" && <span className="rounded bg-destructive/10 px-2 py-1 text-[10px] font-bold uppercase text-destructive">Rejected</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Events */}
          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="font-display text-base font-bold text-primary">Activity log</h2>
            <ol className="mt-3 space-y-2">
              {bundle.events.map((e: any) => (
                <li key={e.id} className="border-l-2 border-border pl-3 text-xs">
                  <div className="text-muted-foreground">{new Date(e.created_at).toLocaleString()} · <span className="font-mono">{e.event_type}</span></div>
                  <div className="text-foreground">{e.message}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Actions sidebar */}
        <aside className="space-y-4 self-start">
          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h3 className="font-display text-sm font-bold text-primary">Workflow actions</h3>
            <div className="mt-3 space-y-2">
              <button disabled={working} onClick={() => setStatus("documents_verified")} className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold hover:border-accent disabled:opacity-50">Mark documents verified</button>
              <div>
                <input value={embassyRef} onChange={(e) => setEmbassyRef(e.target.value)} placeholder="Embassy reference (optional)" className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
                <button disabled={working} onClick={() => setStatus("sent_to_embassy", embassyRef ? { embassy_reference: embassyRef } : {})} className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground disabled:opacity-50"><Send className="h-3 w-3" /> Sent to embassy</button>
              </div>
              <button disabled={working} onClick={() => setStatus("approved")} className="w-full rounded-md bg-success px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">Mark approved</button>
              <div>
                <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason" className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
                <button disabled={working || !rejectReason.trim()} onClick={() => setStatus("rejected", { rejection_reason: rejectReason })} className="mt-1.5 w-full rounded-md border border-destructive bg-white px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive hover:text-white disabled:opacity-50">Mark rejected</button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h3 className="font-display text-sm font-bold text-primary">Deliver visa PDF</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Uploads the issued visa & marks the application delivered. The customer can download it from their tracking page.</p>
            <input ref={pdfInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVisaPdf(f); }} />
            <button disabled={working} onClick={() => pdfInputRef.current?.click()} className="btn-glow mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Upload className="h-3 w-3" /> Upload visa PDF</button>
            {bundle.visa_pdf_url && <a href={bundle.visa_pdf_url} target="_blank" rel="noreferrer" className="mt-2 block text-center text-[11px] font-semibold text-accent hover:underline">View current PDF</a>}
          </section>

          <section className="rounded-2xl border border-border bg-white p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h3 className="font-display text-sm font-bold text-primary">Refund</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Refunds the visa fee ({app.currency} {Number(app.visa_fee).toFixed(2)}) only. Service fee ({app.currency} {Number(app.service_fee).toFixed(2)}) is retained per T&Cs.</p>
            <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Reason (e.g. embassy rejection)" className="mt-2 w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs" />
            <button disabled={working || !!app.refunded_at} onClick={processRefund} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive bg-white px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive hover:text-white disabled:opacity-50"><RefreshCw className="h-3 w-3" /> Issue refund</button>
            {app.refunded_at && <p className="mt-1 text-[11px] text-muted-foreground">Refunded {new Date(app.refunded_at).toLocaleString()}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
