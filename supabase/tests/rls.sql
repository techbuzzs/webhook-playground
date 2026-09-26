begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(4);

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-000000000001', 'one@example.test', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'two@example.test', '{}', 'authenticated', 'authenticated');

insert into public.endpoints (
  id, user_id, receiver_token, name, request_limit, body_size_limit,
  expires_at, history_expires_at
) values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'rls-test-token-one', 'User one endpoint', 100, 262144,
  now() + interval '1 day', now() + interval '7 days'
);

insert into public.deliveries (endpoint_id, method, path, body_size)
values ('10000000-0000-0000-0000-000000000001', 'POST', '/test', 0);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select is((select count(*) from public.endpoints), 0::bigint, 'another user cannot read endpoints');
select is((select count(*) from public.deliveries), 0::bigint, 'another user cannot read deliveries');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select is((select count(*) from public.endpoints), 1::bigint, 'owner can read endpoint');
select is((select count(*) from public.deliveries), 1::bigint, 'owner can read delivery');

select * from finish();
rollback;
