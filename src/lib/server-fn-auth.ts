import { supabase } from "@/integrations/supabase/client";

export async function getServerFnAuthHeaders(): Promise<HeadersInit> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (error || !token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return { Authorization: `Bearer ${token}` };
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}
