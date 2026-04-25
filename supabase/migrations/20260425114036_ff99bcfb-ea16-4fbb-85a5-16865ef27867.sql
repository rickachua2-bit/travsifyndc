-- Recreate the trigger so it fires on any UPDATE, not only when sandbox_api_key/live_api_key
-- appear in the SET clause. The BEFORE trigger maybe_issue_live_key() assigns NEW.live_api_key
-- internally, which a column-scoped AFTER trigger does NOT detect. Result: live keys were
-- generated on the profile but never mirrored into api_keys, so the gateway rejected them.

DROP TRIGGER IF EXISTS profiles_sync_api_keys ON public.profiles;

CREATE TRIGGER profiles_sync_api_keys
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_api_keys_on_approval();

-- Backfill: any profile that has a key on profiles but no matching row in api_keys.
INSERT INTO public.api_keys (user_id, key_hash, key_prefix, environment, name)
SELECT
  p.id,
  encode(extensions.digest(p.sandbox_api_key, 'sha256'), 'hex'),
  substring(p.sandbox_api_key from 1 for 16),
  'sandbox',
  'Default sandbox key'
FROM public.profiles p
WHERE p.sandbox_api_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.api_keys k
    WHERE k.user_id = p.id AND k.environment = 'sandbox'
  );

INSERT INTO public.api_keys (user_id, key_hash, key_prefix, environment, name)
SELECT
  p.id,
  encode(extensions.digest(p.live_api_key, 'sha256'), 'hex'),
  substring(p.live_api_key from 1 for 16),
  'live',
  'Default live key'
FROM public.profiles p
WHERE p.live_api_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.api_keys k
    WHERE k.user_id = p.id AND k.environment = 'live'
  );