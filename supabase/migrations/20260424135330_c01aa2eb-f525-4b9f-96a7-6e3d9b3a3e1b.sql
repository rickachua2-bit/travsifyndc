-- Fix mutable search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Replace permissive contact insert policy with stricter one
drop policy if exists "Anyone can submit contact" on public.contact_submissions;

create policy "Anon submits without user_id" on public.contact_submissions
  for insert to anon with check (user_id is null);

create policy "Authed submits as self" on public.contact_submissions
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);