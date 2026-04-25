// Markup CRUD server functions — partner-scoped (RLS enforced) and admin-scoped (Travsify global).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth as authMiddleware } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VERTICALS = ["flights", "hotels", "transfers", "tours", "visas", "insurance", "car_rentals"] as const;

const MarkupInput = z.object({
  vertical: z.enum(VERTICALS),
  markup_type: z.enum(["fixed", "percentage"]),
  markup_value: z.number().min(0).max(100000),
  currency: z.string().length(3).optional().nullable(),
  is_active: z.boolean().default(true),
});

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

export const listPartnerMarkups = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("markups").select("*").eq("owner_type", "partner").eq("owner_id", context.userId).order("vertical");
    return { markups: data ?? [] };
  });

export const upsertPartnerMarkup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(MarkupInput)
  .handler(async ({ data, context }) => {
    if (data.markup_type === "fixed" && !data.currency) throw new Error("Currency required for fixed markup");
    // Delete prior matching rows so a partner only has one active rule per (vertical, type, currency)
    await context.supabase.from("markups")
      .delete()
      .eq("owner_type", "partner")
      .eq("owner_id", context.userId)
      .eq("vertical", data.vertical)
      .eq("markup_type", data.markup_type);
    const { error } = await context.supabase.from("markups").insert({
      owner_type: "partner",
      owner_id: context.userId,
      vertical: data.vertical,
      markup_type: data.markup_type,
      markup_value: data.markup_value,
      currency: data.markup_type === "fixed" ? (data.currency || "USD").toUpperCase() : null,
      is_active: data.is_active,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePartnerMarkup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await context.supabase.from("markups").delete().eq("id", data.id).eq("owner_id", context.userId);
    return { ok: true };
  });

// ---------- Admin (Travsify global) ----------

export const listAdminMarkups = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admins only");
    const { data } = await supabaseAdmin.from("markups").select("*").eq("owner_type", "travsify").order("vertical");
    return { markups: data ?? [] };
  });

export const upsertAdminMarkup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(MarkupInput)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admins only");
    if (data.markup_type === "fixed" && !data.currency) throw new Error("Currency required for fixed markup");
    await supabaseAdmin.from("markups")
      .delete()
      .eq("owner_type", "travsify")
      .eq("vertical", data.vertical)
      .eq("markup_type", data.markup_type);
    const { error } = await supabaseAdmin.from("markups").insert({
      owner_type: "travsify",
      owner_id: null,
      vertical: data.vertical,
      markup_type: data.markup_type,
      markup_value: data.markup_value,
      currency: data.markup_type === "fixed" ? (data.currency || "USD").toUpperCase() : null,
      is_active: data.is_active,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminMarkup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Admins only");
    await supabaseAdmin.from("markups").delete().eq("id", data.id).eq("owner_type", "travsify");
    return { ok: true };
  });
