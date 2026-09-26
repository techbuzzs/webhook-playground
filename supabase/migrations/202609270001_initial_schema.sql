create extension if not exists pgcrypto;

create type public.account_tier as enum ('basic', 'plus', 'pro', 'super_user');
create type public.account_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  github_login text,
  tier public.account_tier not null default 'basic',
  role public.account_role not null default 'user',
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  anonymous_session_hash text,
  receiver_token text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  tier public.account_tier not null default 'basic',
  request_limit integer not null check (request_limit between 1 and 800),
  body_size_limit integer not null check (body_size_limit between 1 and 2097152),
  request_count integer not null default 0 check (request_count >= 0),
  expires_at timestamptz not null,
  history_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint endpoint_has_owner check (user_id is not null or anonymous_session_hash is not null)
);

create index endpoints_user_id_idx on public.endpoints(user_id, created_at desc);
create index endpoints_anonymous_session_idx on public.endpoints(anonymous_session_hash, created_at desc);
create index endpoints_history_expiry_idx on public.endpoints(history_expires_at);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.endpoints(id) on delete cascade,
  method text not null,
  path text not null,
  query jsonb not null default '{}'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  body text not null default '',
  parsed_json jsonb,
  content_type text,
  body_size integer not null check (body_size >= 0 and body_size <= 2097152),
  received_at timestamptz not null default now()
);

create index deliveries_endpoint_received_idx on public.deliveries(endpoint_id, received_at desc);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('mock_upgrade', 'mock_downgrade')),
  target_tier public.account_tier not null,
  demo_code text not null,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references public.profiles(id),
  target_user_id uuid not null references public.profiles(id),
  action text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, github_login)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'preferred_username')
  )
  on conflict (id) do update set
    email = excluded.email,
    github_login = excluded.github_login;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

create or replace function public.capture_delivery(
  p_token text,
  p_method text,
  p_path text,
  p_query jsonb,
  p_headers jsonb,
  p_body text,
  p_parsed_json jsonb,
  p_content_type text,
  p_body_size integer
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  target public.endpoints%rowtype;
begin
  select * into target
  from public.endpoints
  where receiver_token = p_token
  for update;

  if not found then return 'not_found'; end if;
  if target.expires_at <= now() then return 'expired'; end if;
  if p_body_size > target.body_size_limit then return 'too_large'; end if;
  if target.request_count >= target.request_limit then return 'limit_reached'; end if;

  insert into public.deliveries (
    endpoint_id, method, path, query, headers, body, parsed_json,
    content_type, body_size
  ) values (
    target.id, left(p_method, 16), left(p_path, 2048), coalesce(p_query, '{}'::jsonb),
    coalesce(p_headers, '{}'::jsonb), p_body, p_parsed_json,
    left(p_content_type, 255), p_body_size
  );

  update public.endpoints
  set request_count = request_count + 1
  where id = target.id;
  return 'ok';
end;
$$;

revoke all on function public.capture_delivery(text,text,text,jsonb,jsonb,text,jsonb,text,integer)
from public, anon, authenticated;
grant execute on function public.capture_delivery(text,text,text,jsonb,jsonb,text,jsonb,text,integer)
to service_role;

alter table public.profiles enable row level security;
alter table public.endpoints enable row level security;
alter table public.deliveries enable row level security;
alter table public.billing_events enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "profiles_select_self" on public.profiles
for select to authenticated using (id = auth.uid());

create policy "endpoints_select_own" on public.endpoints
for select to authenticated using (user_id = auth.uid());

create policy "deliveries_select_own" on public.deliveries
for select to authenticated using (
  exists (
    select 1 from public.endpoints
    where endpoints.id = deliveries.endpoint_id
      and endpoints.user_id = auth.uid()
  )
);

create policy "billing_events_select_own" on public.billing_events
for select to authenticated using (user_id = auth.uid());

create or replace function public.cleanup_expired_data()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.endpoints where history_expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;
