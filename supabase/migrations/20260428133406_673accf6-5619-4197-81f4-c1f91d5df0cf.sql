
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS highlights text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS inclusions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS duration text;

ALTER TABLE public.car_transfers
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.car_rentals
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.evisas
  ADD COLUMN IF NOT EXISTS requirement_summary text,
  ADD COLUMN IF NOT EXISTS full_requirements text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS validity text;

ALTER TABLE public.insurance_packages
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS benefits text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_url text;
