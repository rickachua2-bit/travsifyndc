/**
 * Visa Applications — server functions for the full e-visa lifecycle.
 *
 * Lifecycle (status enum public.visa_application_status):
 *   draft → submitted → documents_pending ↔ documents_verified
 *         → sent_to_embassy → approved → delivered
 *                          ↘ rejected → refunded (visa fee only) / cancelled
 *
 * Auth model:
 *   - Customers can be guests OR signed-in. Guest access uses (reference + email)
 *     as the lookup key. Signed-in users get full RLS-backed access.
 *   - Admins use the admin server functions to manage the queue.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- shared helpers ----------

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admins only");
}

async function logEvent(input: {
  application_id: string;
  event_type: string;
  message?: string | null;
  is_customer_visible?: boolean;
  actor_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("visa_application_events").insert({
    application_id: input.application_id,
    event_type: input.event_type,
    message: input.message ?? null,
    is_customer_visible: input.is_customer_visible ?? true,
    actor_id: input.actor_id ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
}

const TravelerSchema = z.object({
  position: z.number().int().min(1).max(20).default(1),
  is_primary: z.boolean().default(false),
  full_name: z.string().min(2).max(120),
  given_names: z.string().max(120).optional().nullable(),
  surname: z.string().max(120).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  nationality: z.string().length(2).optional().nullable(),
  passport_number: z.string().max(40).optional().nullable(),
  passport_issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  passport_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  passport_issuing_country: z.string().length(2).optional().nullable(),
  occupation: z.string().max(120).optional().nullable(),
  marital_status: z.string().max(40).optional().nullable(),
});

// ---------- CUSTOMER: create application after a paid booking ----------

const CreateApplicationSchema = z.object({
  booking_reference: z.string().min(4).max(40),
  customer_email: z.string().email().max(255),
  customer_phone: z.string().max(40).optional(),

  arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accommodation_address: z.string().max(500).optional(),
  flight_number: z.string().max(40).optional(),
  purpose_of_visit: z.string().max(200).optional(),

  travelers: z.array(TravelerSchema).min(1).max(10),
});

export const createVisaApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateApplicationSchema.parse(d))
  .handler(async ({ data }) => {
    const email = data.customer_email.trim().toLowerCase();

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, reference, customer_name, customer_email, currency, total_amount, metadata, vertical, status")
      .eq("reference", data.booking_reference)
      .ilike("customer_email", email)
      .maybeSingle();

    if (bErr) throw new Error(`Booking lookup failed: ${bErr.message}`);
    if (!booking) throw new Error("Booking not found for that reference + email");
    if (booking.vertical !== "visas") throw new Error("Booking is not a visa booking");

    const meta = (booking.metadata as Record<string, unknown>) || {};
    const payload = (meta.payload as Record<string, unknown>) || {};
    const breakdown = (meta.price_breakdown as { provider_base?: number; travsify_markup?: number; total?: number; currency?: string }) || {};
    const visaProductId = String(payload.visa_product_id || "");
    if (!visaProductId) throw new Error("Booking is missing visa_product_id in metadata");

    const { data: existing } = await supabaseAdmin
      .from("visa_applications")
      .select("id, reference, status")
      .eq("booking_id", booking.id)
      .maybeSingle();
    if (existing) return { application_id: existing.id, reference: existing.reference, status: existing.status, already_existed: true };

    const reference = "VAP-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const visa_fee = Number(breakdown.provider_base ?? booking.total_amount);
    const service_fee = Number(breakdown.travsify_markup ?? 0);
    const total_amount = Number(breakdown.total ?? booking.total_amount);

    const primaryTraveler = data.travelers.find((t) => t.is_primary) ?? data.travelers[0];

    const { data: app, error } = await supabaseAdmin
      .from("visa_applications")
      .insert({
        reference,
        user_id: booking.user_id,
        visa_product_id: visaProductId,
        booking_id: booking.id,
        customer_email: email,
        customer_phone: data.customer_phone ?? null,
        customer_name: booking.customer_name ?? primaryTraveler.full_name,
        arrival_date: data.arrival_date ?? null,
        departure_date: data.departure_date ?? null,
        accommodation_address: data.accommodation_address ?? null,
        flight_number: data.flight_number ?? null,
        purpose_of_visit: data.purpose_of_visit ?? null,
        currency: booking.currency,
        visa_fee,
        service_fee,
        total_amount,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        metadata: {
          source: "guest_wizard",
          booking_payload: payload,
        } as never,
      })
      .select("id, reference, status")
      .single();

    if (error || !app) throw new Error(`Application create failed: ${error?.message}`);

    const travelerRows = data.travelers.map((t, idx) => ({
      application_id: app.id,
      position: t.position ?? idx + 1,
      is_primary: t.is_primary ?? idx === 0,
      full_name: t.full_name,
      given_names: t.given_names ?? null,
      surname: t.surname ?? null,
      date_of_birth: t.date_of_birth ?? null,
      gender: t.gender ?? null,
      nationality: t.nationality ?? null,
      passport_number: t.passport_number ?? null,
      passport_issue_date: t.passport_issue_date ?? null,
      passport_expiry_date: t.passport_expiry_date ?? null,
      passport_issuing_country: t.passport_issuing_country ?? null,
      occupation: t.occupation ?? null,
      marital_status: t.marital_status ?? null,
    }));
    const { error: tErr } = await supabaseAdmin
      .from("visa_application_travelers")
      .insert(travelerRows);
    if (tErr) throw new Error(`Traveler insert failed: ${tErr.message}`);

    await logEvent({
      application_id: app.id,
      event_type: "submitted",
      message: "Application submitted. Please upload required documents.",
    });

    return { application_id: app.id, reference: app.reference, status: app.status, already_existed: false };
  });

// ---------- CUSTOMER: signed upload URL for documents ----------

const RequestUploadSchema = z.object({
  application_reference: z.string().min(4).max(40),
  customer_email: z.string().email().max(255),
  document_type: z.string().min(2).max(60),
  document_label: z.string().max(120).optional(),
  file_name: z.string().min(1).max(200),
  mime_type: z.string().min(2).max(120),
  size_bytes: z.number().int().min(1).max(15 * 1024 * 1024),
  traveler_id: z.string().uuid().optional().nullable(),
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/webp",
]);

export const requestDocumentUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RequestUploadSchema.parse(d))
  .handler(async ({ data }) => {
    if (!ALLOWED_MIME.has(data.mime_type.toLowerCase())) {
      throw new Error(`File type ${data.mime_type} is not allowed. Use PDF or image (JPG/PNG/WEBP/HEIC).`);
    }

    const email = data.customer_email.trim().toLowerCase();
    const { data: app, error } = await supabaseAdmin
      .from("visa_applications")
      .select("id, reference, status, customer_email")
      .eq("reference", data.application_reference)
      .ilike("customer_email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Application not found");
    if (["delivered", "refunded", "cancelled"].includes(app.status)) {
      throw new Error("This application is closed and cannot accept new documents.");
    }

    const safeName = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${app.id}/${data.document_type}-${Date.now()}-${safeName}`;

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("visa-documents")
      .createSignedUploadUrl(path);
    if (sErr || !signed) throw new Error(`Could not create upload URL: ${sErr?.message}`);

    return {
      application_id: app.id,
      upload_url: signed.signedUrl,
      token: signed.token,
      storage_path: path,
    };
  });

// ---------- CUSTOMER: register an uploaded document ----------

const RegisterDocSchema = z.object({
  application_reference: z.string().min(4).max(40),
  customer_email: z.string().email().max(255),
  storage_path: z.string().min(8).max(500),
  document_type: z.string().min(2).max(60),
  document_label: z.string().max(120).optional(),
  file_name: z.string().min(1).max(200),
  mime_type: z.string().min(2).max(120),
  size_bytes: z.number().int().min(1).max(15 * 1024 * 1024),
  traveler_id: z.string().uuid().optional().nullable(),
});

export const registerUploadedDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RegisterDocSchema.parse(d))
  .handler(async ({ data }) => {
    const email = data.customer_email.trim().toLowerCase();
    const { data: app } = await supabaseAdmin
      .from("visa_applications")
      .select("id, status")
      .eq("reference", data.application_reference)
      .ilike("customer_email", email)
      .maybeSingle();
    if (!app) throw new Error("Application not found");

    const { data: doc, error } = await supabaseAdmin
      .from("visa_application_documents")
      .insert({
        application_id: app.id,
        traveler_id: data.traveler_id ?? null,
        document_type: data.document_type,
        document_label: data.document_label ?? data.document_type,
        storage_path: data.storage_path,
        file_name: data.file_name,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        status: "pending_review",
      })
      .select("id")
      .single();
    if (error || !doc) throw new Error(`Document register failed: ${error?.message}`);

    if (app.status === "submitted") {
      await supabaseAdmin
        .from("visa_applications")
        .update({ status: "documents_pending" })
        .eq("id", app.id);
    }

    await logEvent({
      application_id: app.id,
      event_type: "document_uploaded",
      message: `Uploaded: ${data.document_label ?? data.document_type}`,
      is_customer_visible: false,
    });

    return { document_id: doc.id };
  });

// ---------- CUSTOMER: lookup application (guest tracking page) ----------

const TrackSchema = z.object({
  reference: z.string().min(4).max(40),
  email: z.string().email().max(255),
});

export const trackVisaApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TrackSchema.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const { data: app, error } = await supabaseAdmin
      .from("visa_applications")
      .select("*")
      .eq("reference", data.reference.trim().toUpperCase())
      .ilike("customer_email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("No application found for that reference + email");

    const [productRes, travelersRes, docsRes, eventsRes] = await Promise.all([
      supabaseAdmin
        .from("visa_products")
        .select("destination_name, visa_type, processing_days_min, processing_days_max, requirements, validity_days, max_stay_days, entry_type")
        .eq("id", app.visa_product_id)
        .maybeSingle(),
      supabaseAdmin
        .from("visa_application_travelers")
        .select("*")
        .eq("application_id", app.id)
        .order("position"),
      supabaseAdmin
        .from("visa_application_documents")
        .select("id, document_type, document_label, file_name, mime_type, size_bytes, status, rejection_reason, uploaded_at, reviewed_at")
        .eq("application_id", app.id)
        .order("uploaded_at", { ascending: false }),
      supabaseAdmin
        .from("visa_application_events")
        .select("event_type, message, created_at, is_customer_visible")
        .eq("application_id", app.id)
        .eq("is_customer_visible", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    let visa_pdf_url: string | null = null;
    if (app.visa_pdf_path && (app.status === "delivered" || app.status === "approved")) {
      const { data: signed } = await supabaseAdmin.storage
        .from("visa-documents")
        .createSignedUrl(app.visa_pdf_path, 60 * 30);
      visa_pdf_url = signed?.signedUrl ?? null;
    }

    return {
      application: app,
      product: productRes.data,
      travelers: travelersRes.data ?? [],
      documents: docsRes.data ?? [],
      events: eventsRes.data ?? [],
      visa_pdf_url,
    };
  });

// ---------- ADMIN: list / inspect / process ----------

export const adminListVisaApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      status: z
        .enum([
          "all",
          "submitted",
          "documents_pending",
          "documents_verified",
          "sent_to_embassy",
          "approved",
          "rejected",
          "delivered",
          "refunded",
          "cancelled",
        ])
        .default("all"),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("visa_applications")
      .select("id, reference, customer_name, customer_email, status, total_amount, currency, created_at, submitted_at, arrival_date, visa_product_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const productIds = Array.from(new Set((rows ?? []).map((r) => r.visa_product_id).filter(Boolean)));
    const { data: products } = await supabaseAdmin
      .from("visa_products")
      .select("id, destination_name, visa_type, sherpa_url")
      .in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]);
    const productMap = new Map((products ?? []).map((p) => [p.id, p]));

    return {
      applications: (rows ?? []).map((r) => {
        const p = productMap.get(r.visa_product_id);
        return {
          ...r,
          destination_name: p?.destination_name ?? "—",
          visa_type: p?.visa_type ?? "—",
          sherpa_url: p?.sherpa_url ?? null,
        };
      }),
    };
  });

export const adminGetVisaApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ application_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: app, error } = await supabaseAdmin
      .from("visa_applications")
      .select("*")
      .eq("id", data.application_id)
      .maybeSingle();
    if (error || !app) throw new Error("Application not found");

    const [product, travelers, docs, events] = await Promise.all([
      supabaseAdmin.from("visa_products").select("*").eq("id", app.visa_product_id).maybeSingle(),
      supabaseAdmin.from("visa_application_travelers").select("*").eq("application_id", app.id).order("position"),
      supabaseAdmin.from("visa_application_documents").select("*").eq("application_id", app.id).order("uploaded_at", { ascending: false }),
      supabaseAdmin.from("visa_application_events").select("*").eq("application_id", app.id).order("created_at", { ascending: false }).limit(100),
    ]);

    const docsWithUrls = await Promise.all(
      (docs.data ?? []).map(async (d) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("visa-documents")
          .createSignedUrl(d.storage_path, 60 * 30);
        return { ...d, preview_url: signed?.signedUrl ?? null };
      }),
    );

    let visa_pdf_url: string | null = null;
    if (app.visa_pdf_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("visa-documents")
        .createSignedUrl(app.visa_pdf_path, 60 * 30);
      visa_pdf_url = signed?.signedUrl ?? null;
    }

    return {
      application: app,
      product: product.data,
      travelers: travelers.data ?? [],
      documents: docsWithUrls,
      events: events.data ?? [],
      visa_pdf_url,
    };
  });

export const adminReviewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      document_id: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      rejection_reason: z.string().min(2).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: doc } = await supabaseAdmin
      .from("visa_application_documents")
      .select("id, application_id, document_label, document_type")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");

    if (data.action === "reject" && !data.rejection_reason) {
      throw new Error("Rejection reason required");
    }

    await supabaseAdmin
      .from("visa_application_documents")
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        rejection_reason: data.action === "reject" ? (data.rejection_reason ?? null) : null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.document_id);

    await logEvent({
      application_id: doc.application_id,
      event_type: data.action === "approve" ? "document_approved" : "document_rejected",
      message:
        data.action === "approve"
          ? `Document approved: ${doc.document_label ?? doc.document_type}`
          : `Document rejected: ${doc.document_label ?? doc.document_type} — ${data.rejection_reason}`,
      actor_id: context.userId,
    });

    return { ok: true };
  });

export const adminUpdateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      status: z.enum([
        "documents_verified",
        "sent_to_embassy",
        "approved",
        "rejected",
        "delivered",
        "cancelled",
      ]),
      embassy_reference: z.string().max(80).optional(),
      rejection_reason: z.string().max(500).optional(),
      message: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status: data.status };
    if (data.status === "documents_verified") update.documents_verified_at = now;
    if (data.status === "sent_to_embassy") {
      update.sent_to_embassy_at = now;
      if (data.embassy_reference) update.embassy_reference = data.embassy_reference;
    }
    if (data.status === "approved") update.embassy_decision_at = now;
    if (data.status === "rejected") {
      update.embassy_decision_at = now;
      update.rejection_reason = data.rejection_reason ?? null;
    }
    if (data.status === "delivered") update.delivered_at = now;

    await supabaseAdmin.from("visa_applications").update(update as never).eq("id", data.application_id);

    await logEvent({
      application_id: data.application_id,
      event_type: data.status,
      message: data.message ?? defaultStatusMessage(data.status),
      actor_id: context.userId,
      metadata: data.embassy_reference ? { embassy_reference: data.embassy_reference } : {},
    });

    return { ok: true };
  });

function defaultStatusMessage(status: string): string {
  switch (status) {
    case "documents_verified": return "All required documents have been verified.";
    case "sent_to_embassy": return "Your application has been submitted to the issuing authority.";
    case "approved": return "Great news — your visa was approved by the issuing authority.";
    case "rejected": return "Unfortunately the issuing authority rejected this application.";
    case "delivered": return "Your visa has been delivered. Download the PDF from your tracking page.";
    case "cancelled": return "This application has been cancelled.";
    default: return "Status updated.";
  }
}

// ---------- ADMIN: upload issued visa PDF ----------

export const adminGetVisaPdfUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      file_name: z.string().min(1).max(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const safe = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.application_id}/issued-visa-${Date.now()}-${safe}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("visa-documents")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(`Upload URL failed: ${error?.message}`);
    return { upload_url: signed.signedUrl, token: signed.token, storage_path: path };
  });

export const adminFinalizeVisaPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      storage_path: z.string().min(8).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin
      .from("visa_applications")
      .update({
        visa_pdf_path: data.storage_path,
        visa_pdf_uploaded_at: new Date().toISOString(),
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", data.application_id);

    await logEvent({
      application_id: data.application_id,
      event_type: "visa_delivered",
      message: "Your visa PDF is now available to download.",
      actor_id: context.userId,
    });
    return { ok: true };
  });

// ---------- ADMIN: refund (visa fee only — service fee retained) ----------

export const adminRefundVisaApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      refund_amount_override: z.number().min(0).max(100000).optional(),
      reason: z.string().min(2).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: app } = await supabaseAdmin
      .from("visa_applications")
      .select("id, visa_fee, service_fee, total_amount, currency, status, refunded_at, booking_id")
      .eq("id", data.application_id)
      .maybeSingle();
    if (!app) throw new Error("Application not found");
    if (app.refunded_at) throw new Error("Already refunded");

    const refundAmount = data.refund_amount_override ?? Number(app.visa_fee);
    const refundReference = `VRFD-${Date.now().toString(36).toUpperCase()}`;

    await supabaseAdmin
      .from("visa_applications")
      .update({
        status: "refunded",
        refund_amount: refundAmount,
        refund_reference: refundReference,
        refunded_at: new Date().toISOString(),
        rejection_reason: app.status === "rejected" ? undefined : `Refund: ${data.reason}`,
      })
      .eq("id", data.application_id);

    await logEvent({
      application_id: data.application_id,
      event_type: "refund_issued",
      message: `Refund issued: ${app.currency} ${refundAmount.toFixed(2)} — ${data.reason}`,
      actor_id: context.userId,
      metadata: { refund_reference: refundReference, refund_amount: refundAmount, currency: app.currency },
    });

    return { ok: true, refund_reference: refundReference, refund_amount: refundAmount };
  });
