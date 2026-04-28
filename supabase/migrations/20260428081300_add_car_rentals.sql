-- Add car_rentals table
CREATE TABLE IF NOT EXISTS public.car_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_name text NOT NULL,
  provider text NOT NULL,
  price_amount numeric NOT NULL,
  price_currency text NOT NULL DEFAULT 'USD',
  location text NOT NULL,
  country text NOT NULL,
  image_url text,
  affiliate_url text,
  original_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rentals_country_idx ON public.car_rentals (country);
