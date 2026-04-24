DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'info@travsify.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User info@travsify.com not found — skipping admin promotion';
    RETURN;
  END IF;

  -- Ensure profile exists (handle_new_user normally creates it, but be safe)
  INSERT INTO public.profiles (id, full_name, company, kyc_status)
  VALUES (v_user_id, 'Travsify Admin', 'Travsify', 'draft')
  ON CONFLICT (id) DO NOTHING;

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Approve KYC so live key + wallets get auto-issued via existing triggers
  UPDATE public.profiles
  SET kyc_status = 'approved',
      kyc_reviewed_at = COALESCE(kyc_reviewed_at, now()),
      kyc_reviewed_by = v_user_id,
      legal_name = COALESCE(legal_name, 'Travsify Limited'),
      trading_name = COALESCE(trading_name, 'Travsify'),
      full_name = COALESCE(full_name, 'Travsify Admin'),
      company = COALESCE(company, 'Travsify')
  WHERE id = v_user_id
    AND kyc_status <> 'approved';
END $$;