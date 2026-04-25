// Global Start configuration — attaches the user's Supabase session token
// to every server function call as an Authorization header so that
// requireSupabaseAuth middleware on the server can authenticate the user.
import { createStart, createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const supabaseAuthHeaderMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        return next({ headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // fall through — server will reject with 401 if auth is required
    }
    return next();
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [supabaseAuthHeaderMiddleware],
}));
