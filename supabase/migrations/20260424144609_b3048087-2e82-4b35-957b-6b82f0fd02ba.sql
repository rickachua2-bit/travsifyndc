-- ============================================================
-- API KEYS (hashed, rotatable, revocable)
-- ============================================================
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL, -- first 12 chars for display, e.g. "tsk_live_a1b"
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  name text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  rate_limit_per_minute integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own keys" ON public.api_keys
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all keys" ON public.api_keys
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users revoke own keys" ON public.api_keys
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- API LOGS (every request)
-- ============================================================
CREATE TABLE public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  environment text NOT NULL,
  method text NOT NULL,
  endpoint text NOT NULL,
  status_code integer NOT NULL,
  latency_ms integer,
  provider text, -- 'duffel' | 'liteapi' | 'ndc' | 'stripe' | 'fincra' | null
  vertical text, -- 'flights' | 'hotels' | 'payments' | 'payouts'
  ip_address text,
  user_agent text,
  error_code text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_logs_user_created ON public.api_logs(user_id, created_at DESC);
CREATE INDEX idx_api_logs_created ON public.api_logs(created_at DESC);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logs" ON public.api_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all logs" ON public.api_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
-- No INSERT policy: only service role writes

-- ============================================================
-- BOOKINGS (unified across verticals)
-- ============================================================
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  vertical text NOT NULL CHECK (vertical IN ('flights', 'hotels', 'transfers', 'tours', 'evisas', 'insurance')),
  provider text NOT NULL, -- 'duffel' | 'ndc' | 'liteapi' etc.
  provider_reference text, -- supplier's PNR/booking ID
  reference text NOT NULL UNIQUE, -- our public reference, e.g. TVS-AB12CD
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'failed', 'refunded')),
  customer_email text,
  customer_name text,
  currency text NOT NULL DEFAULT 'USD',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  margin_amount numeric(12,2) NOT NULL DEFAULT 0,
  stripe_payment_intent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user_created ON public.bookings(user_id, created_at DESC);
CREATE INDEX idx_bookings_reference ON public.bookings(reference);
CREATE INDEX idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all bookings" ON public.bookings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- PAYOUTS (Fincra)
-- ============================================================
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'fincra',
  provider_reference text,
  currency text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_user ON public.payouts(user_id, created_at DESC);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payouts" ON public.payouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all payouts" ON public.payouts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RATE LIMIT BUCKETS (1-minute sliding window)
-- ============================================================
CREATE TABLE public.rate_limit_buckets (
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start)
);

CREATE INDEX idx_rate_buckets_window ON public.rate_limit_buckets(window_start);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- No client policies; service-role only.

-- ============================================================
-- Helper: hash + persist live key on KYC approval
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_api_keys_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Sandbox key: ensure a hashed row exists
  IF NEW.sandbox_api_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.api_keys WHERE user_id = NEW.id AND environment = 'sandbox'
  ) THEN
    INSERT INTO public.api_keys (user_id, key_hash, key_prefix, environment, name)
    VALUES (
      NEW.id,
      encode(extensions.digest(NEW.sandbox_api_key, 'sha256'), 'hex'),
      substring(NEW.sandbox_api_key from 1 for 16),
      'sandbox',
      'Default sandbox key'
    );
  END IF;

  -- Live key: created by maybe_issue_live_key; mirror to api_keys
  IF NEW.live_api_key IS NOT NULL
     AND (OLD.live_api_key IS NULL OR OLD.live_api_key IS DISTINCT FROM NEW.live_api_key) THEN
    INSERT INTO public.api_keys (user_id, key_hash, key_prefix, environment, name)
    VALUES (
      NEW.id,
      encode(extensions.digest(NEW.live_api_key, 'sha256'), 'hex'),
      substring(NEW.live_api_key from 1 for 16),
      'live',
      'Default live key'
    )
    ON CONFLICT (key_hash) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_sync_api_keys
  AFTER INSERT OR UPDATE OF sandbox_api_key, live_api_key ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_api_keys_on_approval();

-- Backfill: hash existing keys
INSERT INTO public.api_keys (user_id, key_hash, key_prefix, environment, name)
SELECT id, encode(extensions.digest(sandbox_api_key, 'sha256'), 'hex'),
       substring(sandbox_api_key from 1 for 16), 'sandbox', 'Default sandbox key'
FROM public.profiles
WHERE sandbox_api_key IS NOT NULL
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO public.api_keys (user_id, key_hash, key_prefix, environment, name)
SELECT id, encode(extensions.digest(live_api_key, 'sha256'), 'hex'),
       substring(live_api_key from 1 for 16), 'live', 'Default live key'
FROM public.profiles
WHERE live_api_key IS NOT NULL
ON CONFLICT (key_hash) DO NOTHING;