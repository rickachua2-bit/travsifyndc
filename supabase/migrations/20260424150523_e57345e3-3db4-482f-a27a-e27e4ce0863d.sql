-- =====================================================
-- WALLETS
-- =====================================================
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD','NGN')),
  balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallets" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER wallets_set_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_wallets_user ON public.wallets(user_id);

-- =====================================================
-- WALLET TRANSACTIONS (immutable ledger)
-- =====================================================
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  currency text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  balance_after numeric(18,2) NOT NULL,
  category text NOT NULL CHECK (category IN ('funding','booking_payment','withdrawal','refund','adjustment','fee')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  reference text NOT NULL,
  description text,
  provider text,
  provider_reference text,
  booking_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reference)
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet txns" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallet txns" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wallet_txn_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_txn_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_txn_booking ON public.wallet_transactions(booking_id);

-- =====================================================
-- STRIPE CUSTOMERS (1:1 with user)
-- =====================================================
CREATE TABLE public.stripe_customers (
  user_id uuid PRIMARY KEY,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own stripe customer" ON public.stripe_customers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all stripe customers" ON public.stripe_customers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SAVED CARDS (display only — actual PM lives at Stripe)
-- =====================================================
CREATE TABLE public.saved_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe')),
  provider_payment_method_id text NOT NULL,
  brand text,
  last4 text,
  exp_month int,
  exp_year int,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_payment_method_id)
);
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cards" ON public.saved_cards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cards" ON public.saved_cards
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all cards" ON public.saved_cards
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_saved_cards_user ON public.saved_cards(user_id);

-- =====================================================
-- BANK ACCOUNTS (for withdrawals)
-- =====================================================
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD','NGN')),
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_code text,
  bank_name text,
  swift_code text,
  iban text,
  routing_number text,
  country text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bank accounts" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all bank accounts" ON public.bank_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bank_accounts_user ON public.bank_accounts(user_id);

-- =====================================================
-- WITHDRAWAL REQUESTS
-- =====================================================
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  currency text NOT NULL CHECK (currency IN ('USD','NGN')),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  fee numeric(18,2) NOT NULL DEFAULT 0,
  net_amount numeric(18,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','processing','paid','failed','rejected','cancelled')),
  provider text CHECK (provider IN ('fincra','manual')),
  provider_reference text,
  admin_notes text,
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users cancel own pending withdrawals" ON public.withdrawal_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));
CREATE POLICY "Admins view all withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all withdrawals" ON public.withdrawal_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER withdrawals_set_updated_at BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_withdrawals_user ON public.withdrawal_requests(user_id, created_at DESC);
CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests(status, created_at DESC);

-- =====================================================
-- FINCRA VIRTUAL ACCOUNTS (1:1 with user, for NGN funding)
-- =====================================================
CREATE TABLE public.fincra_virtual_accounts (
  user_id uuid PRIMARY KEY,
  account_number text NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  bank_code text,
  provider_reference text NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fincra_virtual_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own virtual account" ON public.fincra_virtual_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all virtual accounts" ON public.fincra_virtual_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- ADD STRIPE PAYMENT INTENT INDEX TO BOOKINGS (for webhook lookup)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi ON public.bookings(stripe_payment_intent);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_ref ON public.bookings(provider_reference);

-- =====================================================
-- AUTO-CREATE WALLETS ON KYC APPROVAL
-- =====================================================
CREATE OR REPLACE FUNCTION public.ensure_user_wallets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kyc_status = 'approved' AND OLD.kyc_status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.wallets (user_id, currency, balance)
    VALUES (NEW.id, 'USD', 0), (NEW.id, 'NGN', 0)
    ON CONFLICT (user_id, currency) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_ensure_wallets
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_wallets();

-- Backfill: ensure already-approved users have wallets
INSERT INTO public.wallets (user_id, currency, balance)
SELECT id, 'USD', 0 FROM public.profiles WHERE kyc_status = 'approved'
ON CONFLICT DO NOTHING;
INSERT INTO public.wallets (user_id, currency, balance)
SELECT id, 'NGN', 0 FROM public.profiles WHERE kyc_status = 'approved'
ON CONFLICT DO NOTHING;

-- =====================================================
-- ATOMIC WALLET CREDIT/DEBIT FUNCTIONS (server-only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.wallet_credit(
  p_user_id uuid,
  p_currency text,
  p_amount numeric,
  p_category text,
  p_reference text,
  p_description text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
  v_txn public.wallet_transactions;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  SELECT * INTO v_wallet FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, currency, balance)
    VALUES (p_user_id, p_currency, 0)
    RETURNING * INTO v_wallet;
  END IF;

  UPDATE public.wallets SET balance = balance + p_amount, updated_at = now()
  WHERE id = v_wallet.id RETURNING * INTO v_wallet;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, currency, direction, amount, balance_after,
    category, reference, description, provider, provider_reference, booking_id, metadata
  ) VALUES (
    v_wallet.id, p_user_id, p_currency, 'credit', p_amount, v_wallet.balance,
    p_category, p_reference, p_description, p_provider, p_provider_reference, p_booking_id, p_metadata
  ) RETURNING * INTO v_txn;

  RETURN v_txn;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_debit(
  p_user_id uuid,
  p_currency text,
  p_amount numeric,
  p_category text,
  p_reference text,
  p_description text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
  v_txn public.wallet_transactions;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  SELECT * INTO v_wallet FROM public.wallets
  WHERE user_id = p_user_id AND currency = p_currency FOR UPDATE;

  IF NOT FOUND OR v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'insufficient funds';
  END IF;

  UPDATE public.wallets SET balance = balance - p_amount, updated_at = now()
  WHERE id = v_wallet.id RETURNING * INTO v_wallet;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, currency, direction, amount, balance_after,
    category, reference, description, provider, provider_reference, booking_id, metadata
  ) VALUES (
    v_wallet.id, p_user_id, p_currency, 'debit', p_amount, v_wallet.balance,
    p_category, p_reference, p_description, p_provider, p_provider_reference, p_booking_id, p_metadata
  ) RETURNING * INTO v_txn;

  RETURN v_txn;
END;
$$;

-- Revoke direct execute from clients; only service role calls these
REVOKE ALL ON FUNCTION public.wallet_credit(uuid,text,numeric,text,text,text,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_debit(uuid,text,numeric,text,text,text,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;