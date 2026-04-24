-- Explicitly deny all client access to rate_limit_buckets.
-- Service role bypasses RLS, so the gateway can still read/write.
CREATE POLICY "Deny all client access" ON public.rate_limit_buckets
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);