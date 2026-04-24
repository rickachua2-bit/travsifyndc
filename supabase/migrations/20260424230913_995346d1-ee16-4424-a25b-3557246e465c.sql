-- Tours quote cache for Firecrawl-scraped GetYourGuide listings
CREATE TABLE IF NOT EXISTS public.tour_quote_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_key text NOT NULL,
  date_bucket text NOT NULL,
  travelers_bucket integer NOT NULL,
  tours jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tour_cache_lookup
  ON public.tour_quote_cache (destination_key, date_bucket, travelers_bucket);

ALTER TABLE public.tour_quote_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tour cache"
  ON public.tour_quote_cache
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));