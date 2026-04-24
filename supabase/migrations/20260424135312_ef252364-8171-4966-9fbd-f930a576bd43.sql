-- Enum for roles
create type public.app_role as enum ('admin', 'user');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company text,
  country text,
  role_title text,
  monthly_volume text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Profiles updatable by owner" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Profiles insertable by owner" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- API access requests
create table public.api_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  company text not null,
  country text,
  monthly_volume text,
  verticals text[] not null default '{}',
  use_case text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.api_access_requests enable row level security;

create policy "Anyone signed in can submit api request" on public.api_access_requests
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users view own api requests" on public.api_access_requests
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all api requests" on public.api_access_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Contact submissions (public form)
create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  company text,
  inquiry_type text not null default 'general',
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.contact_submissions enable row level security;

create policy "Anyone can submit contact" on public.contact_submissions
  for insert to anon, authenticated with check (true);
create policy "Users view own submissions" on public.contact_submissions
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all submissions" on public.contact_submissions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();