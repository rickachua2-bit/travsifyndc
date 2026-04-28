-- Add country column to allow for country-wide aggregation
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.car_transfers ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.evisas ADD COLUMN IF NOT EXISTS country text;

-- Index for fast country-level searches
CREATE INDEX IF NOT EXISTS tours_country_idx ON public.tours (country);
CREATE INDEX IF NOT EXISTS car_transfers_country_idx ON public.car_transfers (country);
CREATE INDEX IF NOT EXISTS evisas_country_idx ON public.evisas (country);
