import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type KycStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string | null;
  company: string | null;
  legal_name: string | null;
  trading_name: string | null;
  registration_number: string | null;
  incorporation_country: string | null;
  business_type: string | null;
  website: string | null;
  business_address: Record<string, string> | null;
  contact_role: string | null;
  contact_phone: string | null;
  country: string | null;
  monthly_volume: string | null;
  target_verticals: string[];
  use_case: string | null;
  kyc_status: KycStatus;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  rejection_reason: string | null;
  sandbox_api_key: string | null;
  live_api_key: string | null;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return { profile, loading: authLoading || loading, refresh };
}

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to settle before deciding.
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || loading };
}
