-- Async job queue for flight searches.
-- WHY: Some flight suppliers (Duffel/NDC) regularly take 15–40s to respond.
-- Cloudflare in front of our Worker enforces a ~25–30s ceiling — long enough to
-- cause 522 errors. By splitting search into "enqueue" (returns instantly) and
-- "fetch results" (poll), we never hit that ceiling for the partner-facing call.

CREATE TABLE IF NOT EXISTS public.flight_search_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                       -- partner that owns the API key
  api_key_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox','live')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
  input jsonb NOT NULL,                        -- normalised search input
  result jsonb,                                -- { flights, suppliers_called }
  error_code text,
  error_message text,
  suppliers_called text[] NOT NULL DEFAULT '{}',
  attempts smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS flight_search_jobs_user_idx ON public.flight_search_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS flight_search_jobs_status_idx ON public.flight_search_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS flight_search_jobs_expires_idx ON public.flight_search_jobs (expires_at);

ALTER TABLE public.flight_search_jobs ENABLE ROW LEVEL SECURITY;

-- Partner can view their own jobs (used by polling via the gateway).
CREATE POLICY "Users view own flight search jobs"
  ON public.flight_search_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view everything for ops/debugging.
CREATE POLICY "Admins view all flight search jobs"
  ON public.flight_search_jobs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies for client roles — service role only writes.