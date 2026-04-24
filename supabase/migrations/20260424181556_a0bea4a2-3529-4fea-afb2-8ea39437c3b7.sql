-- Visa products catalogue (Pattern D: own catalogue + manual ops fulfillment via Sherpa portal)
CREATE TABLE public.visa_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nationality text NOT NULL,              -- ISO country code of traveller
  nationality_name text NOT NULL,         -- Display name e.g. "Nigeria"
  destination text NOT NULL,              -- ISO country code of destination
  destination_name text NOT NULL,         -- Display name e.g. "United Arab Emirates"
  visa_type text NOT NULL,                -- e.g. "Tourist", "Business", "Transit"
  entry_type text NOT NULL DEFAULT 'single', -- single | multiple
  validity_days integer NOT NULL,         -- visa validity window
  max_stay_days integer NOT NULL,         -- max stay per entry
  processing_days_min integer NOT NULL,
  processing_days_max integer NOT NULL,
  base_price numeric(12,2) NOT NULL,      -- wholesale (what we pay Sherpa)
  retail_price numeric(12,2) NOT NULL,    -- what customer sees (includes our margin)
  currency text NOT NULL DEFAULT 'USD',
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of strings
  description text,
  sherpa_url text,                        -- portal submission URL for ops
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visa_products_corridor ON public.visa_products (nationality, destination) WHERE is_active;
CREATE INDEX idx_visa_products_destination ON public.visa_products (destination) WHERE is_active;

ALTER TABLE public.visa_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed views active visa products"
ON public.visa_products FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage visa products"
ON public.visa_products FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_visa_products_updated_at
BEFORE UPDATE ON public.visa_products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: 12 high-volume corridors for African outbound travel
INSERT INTO public.visa_products (
  nationality, nationality_name, destination, destination_name,
  visa_type, entry_type, validity_days, max_stay_days,
  processing_days_min, processing_days_max,
  base_price, retail_price, currency,
  requirements, description, sherpa_url, display_order
) VALUES
-- Nigeria outbound
('NG','Nigeria','AE','United Arab Emirates','Tourist','single',60,30,2,4,
  90,135,'USD',
  '["Passport valid 6+ months","Recent passport photo","Confirmed return flight","Hotel booking"]'::jsonb,
  'UAE eVisa for Nigerian passport holders. Valid 60 days from issue, 30-day stay.',
  'https://apply.joinsherpa.com/visa/AE?citizenship=NG&affiliateId=pickpadi', 10),

('NG','Nigeria','GB','United Kingdom','Standard Visitor','single',180,180,15,21,
  150,235,'USD',
  '["Passport valid 6+ months","Bank statements (6 months)","Employment letter","Travel itinerary","Accommodation proof"]'::jsonb,
  'UK Standard Visitor visa for tourism, business meetings, or family visits.',
  'https://apply.joinsherpa.com/visa/GB?citizenship=NG&affiliateId=pickpadi', 20),

('NG','Nigeria','US','United States','B1/B2 Tourist','multiple',3650,180,30,90,
  185,295,'USD',
  '["Passport valid 6+ months","DS-160 confirmation","Bank statements","Employment letter","Travel itinerary","Embassy interview"]'::jsonb,
  'US B1/B2 visa: 10-year multiple entry. Includes embassy interview prep.',
  'https://apply.joinsherpa.com/visa/US?citizenship=NG&affiliateId=pickpadi', 30),

('NG','Nigeria','SC','Schengen Area','Short-Stay','multiple',180,90,10,15,
  110,175,'USD',
  '["Passport valid 3+ months beyond stay","Travel insurance (€30k coverage)","Bank statements","Flight bookings","Hotel reservations","Cover letter"]'::jsonb,
  'Schengen visa covering 27 European countries. Up to 90 days in 180-day period.',
  'https://apply.joinsherpa.com/visa/SC?citizenship=NG&affiliateId=pickpadi', 40),

('NG','Nigeria','CA','Canada','Visitor (TRV)','multiple',3650,180,20,30,
  140,225,'USD',
  '["Passport valid 6+ months","Biometrics","Bank statements","Employment letter","Invitation/itinerary","Photo per spec"]'::jsonb,
  'Canadian Temporary Resident Visa, multiple entry up to 10 years.',
  'https://apply.joinsherpa.com/visa/CA?citizenship=NG&affiliateId=pickpadi', 50),

('NG','Nigeria','TR','Turkey','eVisa','single',180,30,1,2,
  60,95,'USD',
  '["Passport valid 6+ months","Confirmed return flight","Hotel booking"]'::jsonb,
  'Turkey eVisa — fast online processing for Nigerian travellers.',
  'https://apply.joinsherpa.com/visa/TR?citizenship=NG&affiliateId=pickpadi', 60),

-- Kenya outbound
('KE','Kenya','AE','United Arab Emirates','Tourist','single',60,30,2,4,
  90,130,'USD',
  '["Passport valid 6+ months","Passport photo","Return flight","Hotel booking"]'::jsonb,
  'UAE eVisa for Kenyan passport holders.',
  'https://apply.joinsherpa.com/visa/AE?citizenship=KE&affiliateId=pickpadi', 110),

('KE','Kenya','GB','United Kingdom','Standard Visitor','single',180,180,15,21,
  150,230,'USD',
  '["Passport valid 6+ months","Bank statements","Employment letter","Itinerary","Accommodation"]'::jsonb,
  'UK Standard Visitor visa for Kenyan travellers.',
  'https://apply.joinsherpa.com/visa/GB?citizenship=KE&affiliateId=pickpadi', 120),

-- Ghana outbound
('GH','Ghana','AE','United Arab Emirates','Tourist','single',60,30,2,4,
  90,135,'USD',
  '["Passport valid 6+ months","Passport photo","Return flight","Hotel booking"]'::jsonb,
  'UAE eVisa for Ghanaian passport holders.',
  'https://apply.joinsherpa.com/visa/AE?citizenship=GH&affiliateId=pickpadi', 210),

('GH','Ghana','SC','Schengen Area','Short-Stay','multiple',180,90,10,15,
  110,175,'USD',
  '["Passport valid 3+ months beyond stay","Travel insurance (€30k)","Bank statements","Flight bookings","Hotel reservations"]'::jsonb,
  'Schengen short-stay visa for Ghanaian passport holders.',
  'https://apply.joinsherpa.com/visa/SC?citizenship=GH&affiliateId=pickpadi', 220),

-- South Africa outbound
('ZA','South Africa','AE','United Arab Emirates','Tourist','single',60,30,2,4,
  90,130,'USD',
  '["Passport valid 6+ months","Passport photo","Return flight","Hotel booking"]'::jsonb,
  'UAE eVisa for South African passport holders.',
  'https://apply.joinsherpa.com/visa/AE?citizenship=ZA&affiliateId=pickpadi', 310),

('ZA','South Africa','US','United States','B1/B2 Tourist','multiple',3650,180,30,90,
  185,290,'USD',
  '["Passport valid 6+ months","DS-160","Bank statements","Employment letter","Embassy interview"]'::jsonb,
  'US B1/B2 visa for South African travellers.',
  'https://apply.joinsherpa.com/visa/US?citizenship=ZA&affiliateId=pickpadi', 320);
