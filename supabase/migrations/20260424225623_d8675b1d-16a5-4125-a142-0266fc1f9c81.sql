-- 1) Extend travel_vertical enum with car_rentals
ALTER TYPE public.travel_vertical ADD VALUE IF NOT EXISTS 'car_rentals';

-- 2) Transfer quote cache
CREATE TABLE IF NOT EXISTS public.transfer_quote_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_key text NOT NULL,
  dropoff_key text NOT NULL,
  datetime_bucket text NOT NULL,
  passengers_bucket integer NOT NULL,
  quotes jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_cache_lookup
  ON public.transfer_quote_cache (pickup_key, dropoff_key, datetime_bucket, passengers_bucket);

ALTER TABLE public.transfer_quote_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage transfer cache"
  ON public.transfer_quote_cache
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) Car rental quote cache
CREATE TABLE IF NOT EXISTS public.car_rental_quote_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  pickup_date text NOT NULL,
  dropoff_date text NOT NULL,
  driver_age_bucket integer NOT NULL,
  quotes jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_cache_lookup
  ON public.car_rental_quote_cache (pickup_location, dropoff_location, pickup_date, dropoff_date, driver_age_bucket);

ALTER TABLE public.car_rental_quote_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage car rental cache"
  ON public.car_rental_quote_cache
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));