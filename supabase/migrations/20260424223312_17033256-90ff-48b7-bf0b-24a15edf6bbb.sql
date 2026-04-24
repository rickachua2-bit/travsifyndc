CREATE TABLE public.insurance_quote_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination text NOT NULL,
  nationality text NOT NULL,
  duration_bucket integer NOT NULL,
  max_age integer NOT NULL,
  travelers_count integer NOT NULL,
  quotes jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (destination, nationality, duration_bucket, max_age, travelers_count)
);

CREATE INDEX idx_insurance_quote_cache_lookup
  ON public.insurance_quote_cache (destination, nationality, duration_bucket, max_age, travelers_count, last_scraped_at);

ALTER TABLE public.insurance_quote_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage insurance cache"
  ON public.insurance_quote_cache
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));