// Global Start configuration — attaches the user's Supabase session token
// to every server function call automatically by overriding the global fetch
// used for /_serverFn requests. This works for all useServerFn() and direct
// server function calls without each caller having to pass headers manually.
import { createStart } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const authedServerFnFetch: typeof fetch = async (input, init) => {
  if (typeof window === "undefined") return fetch(input, init);

  const headers = new Headers(init?.headers || {});
  if (!headers.has("Authorization")) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {
      // fall through — server returns 401 if auth required
    }
  }
  return fetch(input, { ...init, headers });
};

export const startInstance = createStart(() => ({
  serverFns: { fetch: authedServerFnFetch },
}));
