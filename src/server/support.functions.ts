import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function isAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

// ─── Partner: list own tickets ───────────────────────────────
export const listMyTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tickets: data ?? [] };
  });

// ─── Partner: create ticket ──────────────────────────────────
const createSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  category: z.string().trim().min(1).max(40).default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  body: z.string().trim().min(5).max(5000),
});

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("support_tickets")
      .insert({
        user_id: context.userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { error: msgErr } = await context.supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        author_id: context.userId,
        is_staff: false,
        body: data.body,
      });
    if (msgErr) throw new Error(msgErr.message);

    return { ticket };
  });

// ─── Get ticket + messages (partner sees own; admin sees any) ─
const idSchema = z.object({ ticketId: z.string().uuid() });

export const getTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context.userId);
    const client = admin ? supabaseAdmin : context.supabase;

    const { data: ticket, error } = await client
      .from("support_tickets")
      .select("*")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) throw new Error("Ticket not found");

    const { data: messages, error: mErr } = await client
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    let partner: { email: string | null; legal_name: string | null; company: string | null } | null = null;
    if (admin) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("legal_name, company")
        .eq("id", ticket.user_id)
        .maybeSingle();
      const { data: usr } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id);
      partner = {
        email: usr?.user?.email ?? null,
        legal_name: prof?.legal_name ?? null,
        company: prof?.company ?? null,
      };
    }

    return { ticket, messages: messages ?? [], partner };
  });

// ─── Post a reply ────────────────────────────────────────────
const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => replySchema.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context.userId);
    const client = admin ? supabaseAdmin : context.supabase;

    // Verify access
    const { data: t } = await client
      .from("support_tickets")
      .select("id, user_id")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!t) throw new Error("Ticket not found");
    if (!admin && t.user_id !== context.userId) throw new Error("Forbidden");

    const { data: msg, error } = await client
      .from("support_ticket_messages")
      .insert({
        ticket_id: data.ticketId,
        author_id: context.userId,
        is_staff: admin,
        body: data.body,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { message: msg };
  });

// ─── Admin: list all tickets ─────────────────────────────────
export const adminListTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");

    const { data: tickets, error } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((tickets ?? []).map((t) => t.user_id)));
    const profilesById: Record<string, { legal_name: string | null; company: string | null }> = {};
    if (userIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, legal_name, company")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        profilesById[p.id] = { legal_name: p.legal_name, company: p.company };
      }
    }

    return {
      tickets: (tickets ?? []).map((t) => ({
        ...t,
        partner_label:
          profilesById[t.user_id]?.legal_name ||
          profilesById[t.user_id]?.company ||
          t.user_id.slice(0, 8),
      })),
    };
  });

// ─── Admin: update status ────────────────────────────────────
const statusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "closed"]),
});

export const adminUpdateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
