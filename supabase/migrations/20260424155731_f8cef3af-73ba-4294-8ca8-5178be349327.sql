-- 1) Fix handle_new_user: qualify gen_random_bytes with the extensions schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_sandbox_key text;
BEGIN
  v_sandbox_key := 'tsk_sandbox_' || encode(extensions.gen_random_bytes(24), 'hex');

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
$function$;

-- Also fix maybe_issue_live_key (same bug)
CREATE OR REPLACE FUNCTION public.maybe_issue_live_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.kyc_status = 'approved' AND OLD.kyc_status IS DISTINCT FROM 'approved' AND NEW.live_api_key IS NULL THEN
    NEW.live_api_key := 'tsk_live_' || encode(extensions.gen_random_bytes(24), 'hex');
    NEW.kyc_reviewed_at := COALESCE(NEW.kyc_reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Markup system
CREATE TYPE public.markup_owner_type AS ENUM ('travsify', 'partner');
CREATE TYPE public.markup_value_type AS ENUM ('fixed', 'percentage');
CREATE TYPE public.travel_vertical AS ENUM ('flights', 'hotels', 'transfers', 'tours', 'visas', 'insurance');

CREATE TABLE public.markups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type public.markup_owner_type NOT NULL,
  owner_id uuid,
  vertical public.travel_vertical NOT NULL,
  markup_type public.markup_value_type NOT NULL,
  markup_value numeric(14,4) NOT NULL CHECK (markup_value >= 0),
  currency text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT travsify_has_no_owner CHECK (
    (owner_type = 'travsify' AND owner_id IS NULL) OR
    (owner_type = 'partner'  AND owner_id IS NOT NULL)
  ),
  CONSTRAINT fixed_requires_currency CHECK (
    (markup_type = 'fixed' AND currency IS NOT NULL) OR
    (markup_type = 'percentage' AND currency IS NULL)
  ),
  CONSTRAINT percentage_max_100 CHECK (
    markup_type <> 'percentage' OR markup_value <= 100
  )
);

-- One percentage row per (owner, vertical); one fixed row per (owner, vertical, currency)
CREATE UNIQUE INDEX markups_partner_pct_unique
  ON public.markups (owner_id, vertical)
  WHERE owner_type = 'partner' AND markup_type = 'percentage';

CREATE UNIQUE INDEX markups_partner_fixed_unique
  ON public.markups (owner_id, vertical, currency)
  WHERE owner_type = 'partner' AND markup_type = 'fixed';

CREATE UNIQUE INDEX markups_travsify_pct_unique
  ON public.markups (vertical)
  WHERE owner_type = 'travsify' AND markup_type = 'percentage';

CREATE UNIQUE INDEX markups_travsify_fixed_unique
  ON public.markups (vertical, currency)
  WHERE owner_type = 'travsify' AND markup_type = 'fixed';

ALTER TABLE public.markups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own markups"
  ON public.markups FOR SELECT TO authenticated
  USING (owner_type = 'partner' AND owner_id = auth.uid());

CREATE POLICY "Anyone authed views travsify markups"
  ON public.markups FOR SELECT TO authenticated
  USING (owner_type = 'travsify');

CREATE POLICY "Partners insert own markups"
  ON public.markups FOR INSERT TO authenticated
  WITH CHECK (owner_type = 'partner' AND owner_id = auth.uid());

CREATE POLICY "Partners update own markups"
  ON public.markups FOR UPDATE TO authenticated
  USING (owner_type = 'partner' AND owner_id = auth.uid())
  WITH CHECK (owner_type = 'partner' AND owner_id = auth.uid());

CREATE POLICY "Partners delete own markups"
  ON public.markups FOR DELETE TO authenticated
  USING (owner_type = 'partner' AND owner_id = auth.uid());

CREATE POLICY "Admins manage all markups"
  ON public.markups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER markups_set_updated_at
  BEFORE UPDATE ON public.markups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Bookings: fulfillment mode for affiliate verticals
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS fulfillment_mode text NOT NULL DEFAULT 'auto'
    CHECK (fulfillment_mode IN ('auto', 'manual'));

CREATE INDEX IF NOT EXISTS bookings_processing_queue_idx
  ON public.bookings (created_at DESC)
  WHERE fulfillment_mode = 'manual' AND status = 'processing';

-- 4) Pricing helper: compose final price from provider_base + travsify + partner markups
CREATE OR REPLACE FUNCTION public.compose_price(
  p_partner_id uuid,
  p_vertical public.travel_vertical,
  p_provider_base numeric,
  p_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_travsify numeric := 0;
  v_partner numeric := 0;
  v_row public.markups;
BEGIN
  -- Travsify markup (percentage takes precedence if both somehow exist; otherwise fixed in this currency)
  SELECT * INTO v_row FROM public.markups
   WHERE owner_type = 'travsify' AND vertical = p_vertical AND is_active
     AND markup_type = 'percentage'
   LIMIT 1;
  IF FOUND THEN
    v_travsify := round(p_provider_base * v_row.markup_value / 100, 2);
  ELSE
    SELECT * INTO v_row FROM public.markups
     WHERE owner_type = 'travsify' AND vertical = p_vertical AND is_active
       AND markup_type = 'fixed' AND currency = p_currency
     LIMIT 1;
    IF FOUND THEN
      v_travsify := v_row.markup_value;
    END IF;
  END IF;

  -- Partner markup
  IF p_partner_id IS NOT NULL THEN
    SELECT * INTO v_row FROM public.markups
     WHERE owner_type = 'partner' AND owner_id = p_partner_id
       AND vertical = p_vertical AND is_active
       AND markup_type = 'percentage'
     LIMIT 1;
    IF FOUND THEN
      v_partner := round(p_provider_base * v_row.markup_value / 100, 2);
    ELSE
      SELECT * INTO v_row FROM public.markups
       WHERE owner_type = 'partner' AND owner_id = p_partner_id
         AND vertical = p_vertical AND is_active
         AND markup_type = 'fixed' AND currency = p_currency
       LIMIT 1;
      IF FOUND THEN
        v_partner := v_row.markup_value;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'provider_base', p_provider_base,
    'travsify_markup', v_travsify,
    'partner_markup', v_partner,
    'total', p_provider_base + v_travsify + v_partner,
    'currency', p_currency
  );
END;
$$;