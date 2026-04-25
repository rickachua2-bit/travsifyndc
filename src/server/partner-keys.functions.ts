// Partner-facing key management: regenerate sandbox/live keys, revoke a key.
// Keys live in two places that must stay in sync:
//   - profiles.sandbox_api_key / profiles.live_api_key  (plaintext, shown to owner)
//   - api_keys (sha256 hash, used by the gateway)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth as authMiddleware } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash, randomBytes } from "crypto";

function generateKey(env: "sandbox" | "live") {
  return `tsk_${env}_${randomBytes(24).toString("hex")}`;
}
function sha256(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, kyc_status, sandbox_api_key, live_api_key")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Profile not found");
  return data;
}

// ---------------------------------------------------------------------------
// List the caller's own keys (gateway view: hash rows, with status)
// ---------------------------------------------------------------------------
export const listMyApiKeys = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, key_prefix, environment, name, last_used_at, revoked_at, rate_limit_per_minute, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { keys: data ?? [] };
  });

// ---------------------------------------------------------------------------
// Regenerate (rotate) the sandbox or live key.
// - Old key row is marked revoked (so it stops working at the gateway).
// - New plaintext is written to profiles + a fresh hashed row in api_keys.
// - Returns the new plaintext ONCE — the partner must copy it.
// ---------------------------------------------------------------------------
export const regenerateApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ environment: z.enum(["sandbox", "live"]) }))
  .handler(async ({ data, context }) => {
    const profile = await getProfile(context.userId);

    if (data.environment === "live" && profile.kyc_status !== "approved") {
      throw new Error("Live keys are only available after KYC approval");
    }

    // 1. Revoke any currently-active key rows for this env
    const nowIso = new Date().toISOString();
    const { error: revokeErr } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: nowIso })
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .is("revoked_at", null);
    if (revokeErr) throw new Error(revokeErr.message);

    // 2. Mint a fresh key
    const plaintext = generateKey(data.environment);
    const hash = sha256(plaintext);

    // 3. Insert the new hashed row
    const { error: insErr } = await supabaseAdmin.from("api_keys").insert({
      user_id: context.userId,
      key_hash: hash,
      key_prefix: plaintext.slice(0, 16),
      environment: data.environment,
      name: data.environment === "live" ? "Live key" : "Sandbox key",
    });
    if (insErr) throw new Error(insErr.message);

    // 4. Mirror plaintext on the profile so the dashboard can display it
    const patch =
      data.environment === "sandbox"
        ? { sandbox_api_key: plaintext }
        : { live_api_key: plaintext };
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (profErr) throw new Error(profErr.message);

    return { key: plaintext, environment: data.environment };
  });

// ---------------------------------------------------------------------------
// Revoke a single key by id (gateway will reject it within seconds).
// Does NOT auto-mint a replacement — partner can call regenerate separately.
// ---------------------------------------------------------------------------
export const revokeMyApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ key_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    // Confirm ownership
    const { data: row, error: selErr } = await supabaseAdmin
      .from("api_keys")
      .select("id, user_id, environment, revoked_at")
      .eq("id", data.key_id)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row || row.user_id !== context.userId) throw new Error("Key not found");
    if (row.revoked_at) return { ok: true, already: true };

    const { error: upErr } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.key_id);
    if (upErr) throw new Error(upErr.message);

    // Clear the plaintext on the profile so the UI no longer shows a stale key
    const patch =
      row.environment === "sandbox"
        ? { sandbox_api_key: null }
        : { live_api_key: null };
    await supabaseAdmin.from("profiles").update(patch).eq("id", context.userId);

    return { ok: true };
  });
