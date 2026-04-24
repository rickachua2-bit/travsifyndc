-- Extend profiles with KYC fields
DO $$ BEGIN
  CREATE TYPE public.kyc_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS trading_name text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS incorporation_country text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS business_address jsonb,
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS target_verticals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS use_case text,
  ADD COLUMN IF NOT EXISTS kyc_status public.kyc_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS sandbox_api_key text UNIQUE,
  ADD COLUMN IF NOT EXISTS live_api_key text UNIQUE;

-- Admin can view and update profiles
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- KYC drafts (save & resume)
CREATE TABLE IF NOT EXISTS public.kyc_drafts (
  user_id uuid PRIMARY KEY,
  current_step int NOT NULL DEFAULT 1,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own draft" ON public.kyc_drafts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts own draft" ON public.kyc_drafts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own draft" ON public.kyc_drafts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner deletes own draft" ON public.kyc_drafts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all drafts" ON public.kyc_drafts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER kyc_drafts_set_updated_at
  BEFORE UPDATE ON public.kyc_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- KYC audit log (system-managed, read-only)
CREATE TABLE IF NOT EXISTS public.kyc_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  from_status public.kyc_status,
  to_status public.kyc_status,
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own audit" ON public.kyc_audit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all audit" ON public.kyc_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_kyc_audit_user ON public.kyc_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON public.profiles(kyc_status);

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_kyc_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    INSERT INTO public.kyc_audit_log (user_id, action, from_status, to_status, reason, actor_id)
    VALUES (
      NEW.id,
      CASE NEW.kyc_status
        WHEN 'submitted' THEN 'submit'
        WHEN 'under_review' THEN 'start_review'
        WHEN 'approved' THEN 'approve'
        WHEN 'rejected' THEN 'reject'
        ELSE 'update'
      END,
      OLD.kyc_status,
      NEW.kyc_status,
      NEW.rejection_reason,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_log_kyc_change ON public.profiles;
CREATE TRIGGER profiles_log_kyc_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_kyc_status_change();

-- Generate sandbox key + profile on signup (replaces existing handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sandbox_key text;
BEGIN
  v_sandbox_key := 'tsk_sandbox_' || encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.profiles (id, full_name, company, sandbox_api_key, kyc_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    v_sandbox_key,
    'draft'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill sandbox keys for existing users
UPDATE public.profiles
SET sandbox_api_key = 'tsk_sandbox_' || encode(gen_random_bytes(24), 'hex')
WHERE sandbox_api_key IS NULL;

-- Generate live key on approval
CREATE OR REPLACE FUNCTION public.maybe_issue_live_key()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kyc_status = 'approved' AND OLD.kyc_status IS DISTINCT FROM 'approved' AND NEW.live_api_key IS NULL THEN
    NEW.live_api_key := 'tsk_live_' || encode(gen_random_bytes(24), 'hex');
    NEW.kyc_reviewed_at := COALESCE(NEW.kyc_reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_issue_live_key ON public.profiles;
CREATE TRIGGER profiles_issue_live_key
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.maybe_issue_live_key();