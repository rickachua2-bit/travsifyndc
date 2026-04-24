/**
 * Visa products — Pattern D (own catalogue + manual fulfillment via Sherpa portal).
 *
 * We do NOT call Sherpa's data API here. Instead, we maintain our own visa_products
 * table for high-volume corridors. Each row stores:
 *   - retail_price (what the customer pays — includes our markup)
 *   - base_price (what we expect Sherpa to charge us — used for booking margin tracking)
 *   - sherpa_url (the affiliate-tagged portal URL ops uses to submit the application,
 *     so we still earn the affiliate commission on top of our markup)
 *
 * Search is public (no auth). Admin CRUD is gated by the admin role.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { convert as fxConvert, SUPPORTED_CURRENCIES } from "@/server/fx";

const DisplayCurrencyEnum = z.enum(SUPPORTED_CURRENCIES as [string, ...string[]]);

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admins only");
}

// ---------- PUBLIC SEARCH ----------

export const publicSearchVisaProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      nationality: z.string().length(2),
      destination: z.string().length(2).optional(),
      display_currency: DisplayCurrencyEnum.optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<string> => {
    const display = (data.display_currency || "USD").toUpperCase();
    let query = supabaseAdmin
      .from("visa_products")
      .select("*")
      .eq("is_active", true)
      .eq("nationality", data.nationality.toUpperCase())
      .order("display_order", { ascending: true });

    if (data.destination) {
      query = query.eq("destination", data.destination.toUpperCase());
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("visa product search failed:", error);
      return JSON.stringify({ products: [], display_currency: display, error: error.message });
    }

    const products = await Promise.all(
      (rows ?? []).map(async (r) => {
        const native = String(r.currency || "USD").toUpperCase();
        const retailInDisplay = await fxConvert(Number(r.retail_price), native, display);
        const baseInDisplay = await fxConvert(Number(r.base_price), native, display);
        return {
          id: r.id,
          nationality: r.nationality,
          nationality_name: r.nationality_name,
          destination: r.destination,
          destination_name: r.destination_name,
          visa_type: r.visa_type,
          entry_type: r.entry_type,
          validity_days: r.validity_days,
          max_stay_days: r.max_stay_days,
          processing_days_min: r.processing_days_min,
          processing_days_max: r.processing_days_max,
          requirements: (r.requirements as string[]) ?? [],
          description: r.description ?? "",
          image_url: r.image_url ?? null,
          sherpa_url: r.sherpa_url ?? null,
          base_price: Number(baseInDisplay.toFixed(2)),       // for booking record
          base_currency: display,                              // already converted
          price: Number(retailInDisplay.toFixed(2)),           // displayed retail
          currency: display,
          // Always show retail vs. base so partners can see implicit margin
          margin: Number((retailInDisplay - baseInDisplay).toFixed(2)),
        };
      }),
    );

    return JSON.stringify({ products, display_currency: display });
  });

// List unique nationalities we support — used to populate the form dropdown.
export const listVisaCorridors = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("visa_products")
      .select("nationality, nationality_name, destination, destination_name")
      .eq("is_active", true)
      .order("nationality_name", { ascending: true });
    const nationalities = new Map<string, string>();
    const destinations = new Map<string, string>();
    for (const r of data ?? []) {
      nationalities.set(r.nationality, r.nationality_name);
      destinations.set(r.destination, r.destination_name);
    }
    return {
      nationalities: Array.from(nationalities, ([code, name]) => ({ code, name })),
      destinations: Array.from(destinations, ([code, name]) => ({ code, name })),
    };
  });

// ---------- ADMIN CRUD ----------

const ProductSchema = z.object({
  nationality: z.string().length(2),
  nationality_name: z.string().min(1).max(80),
  destination: z.string().length(2),
  destination_name: z.string().min(1).max(80),
  visa_type: z.string().min(1).max(60),
  entry_type: z.enum(["single", "multiple"]).default("single"),
  validity_days: z.number().int().min(1).max(7300),
  max_stay_days: z.number().int().min(1).max(7300),
  processing_days_min: z.number().int().min(0).max(180),
  processing_days_max: z.number().int().min(0).max(365),
  base_price: z.number().min(0).max(100000),
  retail_price: z.number().min(0).max(100000),
  currency: z.string().length(3).default("USD"),
  requirements: z.array(z.string().min(1).max(200)).max(20).default([]),
  description: z.string().max(2000).optional().nullable(),
  sherpa_url: z.string().url().max(500).optional().nullable(),
  image_url: z.string().url().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
  display_order: z.number().int().min(0).max(99999).default(0),
});

export const adminListVisaProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("visa_products")
      .select("*")
      .order("nationality_name", { ascending: true })
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { products: data ?? [] };
  });

export const adminCreateVisaProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const insert = {
      ...data,
      nationality: data.nationality.toUpperCase(),
      destination: data.destination.toUpperCase(),
      currency: data.currency.toUpperCase(),
    };
    const { data: row, error } = await supabaseAdmin
      .from("visa_products")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { product: row };
  });

export const adminUpdateVisaProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: ProductSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = { ...data.patch };
    if (typeof patch.nationality === "string") patch.nationality = (patch.nationality as string).toUpperCase();
    if (typeof patch.destination === "string") patch.destination = (patch.destination as string).toUpperCase();
    if (typeof patch.currency === "string") patch.currency = (patch.currency as string).toUpperCase();
    const { data: row, error } = await supabaseAdmin
      .from("visa_products")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { product: row };
  });

export const adminDeleteVisaProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("visa_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
