-- Track Sherpa scrape job runs so admin can see progress and history
CREATE TABLE public.visa_scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running', -- running | completed | failed
  total_corridors integer NOT NULL DEFAULT 0,
  scraped_count integer NOT NULL DEFAULT 0,
  upserted_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.visa_scrape_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all scrape runs" ON public.visa_scrape_runs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add a unique constraint to support upserting visa_products by corridor + visa_type
ALTER TABLE public.visa_products
ADD CONSTRAINT visa_products_corridor_type_unique
UNIQUE (nationality, destination, visa_type);

-- Track when a product was last refreshed from Sherpa
ALTER TABLE public.visa_products
ADD COLUMN IF NOT EXISTS last_scraped_at timestamptz;