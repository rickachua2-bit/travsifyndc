
-- =========================================================
-- Visa application status enum
-- =========================================================
CREATE TYPE public.visa_application_status AS ENUM (
  'draft',
  'submitted',
  'documents_pending',
  'documents_verified',
  'sent_to_embassy',
  'approved',
  'rejected',
  'delivered',
  'refunded',
  'cancelled'
);

CREATE TYPE public.visa_document_status AS ENUM (
  'pending_review',
  'approved',
  'rejected'
);

-- =========================================================
-- visa_applications
-- =========================================================
CREATE TABLE public.visa_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visa_product_id uuid NOT NULL REFERENCES public.visa_products(id),
  booking_id uuid,

  -- Customer (works for guest checkout)
  customer_email text NOT NULL,
  customer_phone text,
  customer_name text NOT NULL,

  -- Trip details
  arrival_date date,
  departure_date date,
  accommodation_address text,
  flight_number text,
  purpose_of_visit text,

  -- Pricing
  currency text NOT NULL DEFAULT 'USD',
  visa_fee numeric(12,2) NOT NULL DEFAULT 0,        -- refundable portion
  service_fee numeric(12,2) NOT NULL DEFAULT 0,     -- non-refundable markup
  total_amount numeric(12,2) NOT NULL DEFAULT 0,

  -- Status & lifecycle
  status public.visa_application_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  documents_verified_at timestamptz,
  sent_to_embassy_at timestamptz,
  embassy_decision_at timestamptz,
  delivered_at timestamptz,

  -- Outcome
  rejection_reason text,
  embassy_reference text,
  visa_pdf_path text,                 -- storage path to issued visa PDF
  visa_pdf_uploaded_at timestamptz,

  -- Refund
  refund_amount numeric(12,2),
  refunded_at timestamptz,
  refund_reference text,

  -- Ops
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visa_apps_reference ON public.visa_applications(reference);
CREATE INDEX idx_visa_apps_user ON public.visa_applications(user_id);
CREATE INDEX idx_visa_apps_email ON public.visa_applications(customer_email);
CREATE INDEX idx_visa_apps_status ON public.visa_applications(status);
CREATE INDEX idx_visa_apps_assigned ON public.visa_applications(assigned_admin_id);

ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications"
  ON public.visa_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all applications"
  ON public.visa_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all applications"
  ON public.visa_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_visa_apps_updated_at
  BEFORE UPDATE ON public.visa_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- visa_application_travelers
-- =========================================================
CREATE TABLE public.visa_application_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.visa_applications(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 1,                  -- 1 = primary applicant
  is_primary boolean NOT NULL DEFAULT false,

  full_name text NOT NULL,
  given_names text,
  surname text,
  date_of_birth date,
  gender text,
  nationality text,
  passport_number text,
  passport_issue_date date,
  passport_expiry_date date,
  passport_issuing_country text,
  occupation text,
  marital_status text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visa_travelers_app ON public.visa_application_travelers(application_id);

ALTER TABLE public.visa_application_travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own travelers"
  ON public.visa_application_travelers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.visa_applications va
    WHERE va.id = application_id AND va.user_id = auth.uid()
  ));

CREATE POLICY "Admins view all travelers"
  ON public.visa_application_travelers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all travelers"
  ON public.visa_application_travelers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_visa_travelers_updated_at
  BEFORE UPDATE ON public.visa_application_travelers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- visa_application_documents
-- =========================================================
CREATE TABLE public.visa_application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.visa_applications(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES public.visa_application_travelers(id) ON DELETE CASCADE,

  document_type text NOT NULL,            -- e.g. 'passport_bio', 'photo', 'bank_statement', 'invitation_letter'
  document_label text,                    -- human-friendly name from requirements list
  storage_path text NOT NULL,             -- path in visa-documents bucket
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,

  status public.visa_document_status NOT NULL DEFAULT 'pending_review',
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,

  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_visa_docs_app ON public.visa_application_documents(application_id);
CREATE INDEX idx_visa_docs_status ON public.visa_application_documents(status);

ALTER TABLE public.visa_application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own documents"
  ON public.visa_application_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.visa_applications va
    WHERE va.id = application_id AND va.user_id = auth.uid()
  ));

CREATE POLICY "Admins view all documents"
  ON public.visa_application_documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all documents"
  ON public.visa_application_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- visa_application_events (timeline)
-- =========================================================
CREATE TABLE public.visa_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.visa_applications(id) ON DELETE CASCADE,
  event_type text NOT NULL,           -- 'submitted','documents_verified','sent_to_embassy','approved','rejected','visa_delivered','refund_issued','document_rejected','note'
  message text,
  is_customer_visible boolean NOT NULL DEFAULT true,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visa_events_app ON public.visa_application_events(application_id, created_at DESC);

ALTER TABLE public.visa_application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own visible events"
  ON public.visa_application_events FOR SELECT TO authenticated
  USING (
    is_customer_visible = true
    AND EXISTS (
      SELECT 1 FROM public.visa_applications va
      WHERE va.id = application_id AND va.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all events"
  ON public.visa_application_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Storage bucket for visa documents (private)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('visa-documents', 'visa-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Admin-only direct read; everyone else goes through signed URLs from server functions
CREATE POLICY "Admins read visa docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'visa-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write visa docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'visa-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update visa docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'visa-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete visa docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'visa-documents' AND public.has_role(auth.uid(), 'admin'));
