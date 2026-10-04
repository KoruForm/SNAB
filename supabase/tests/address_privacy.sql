-- Address privacy checks for 002_public_sale_privacy.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Seller A has four sales covering each reveal setting; seller B has one. Sale days are 2026-10-10 and 2026-10-11 (NZ).
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.sales (id, owner_id, title, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Sale day reveal', 'published'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Show now', 'published'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Area only', 'published'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'Still a draft', 'draft'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000b', 'Closed early', 'closed');
insert into public.sale_days (sale_id, sale_date, starts, finishes)
  select id, d, '08:00', '13:00' from public.sales, unnest(array['2026-10-10', '2026-10-11']::date[]) d;
insert into public.sale_private_locations (sale_id, address, town, exact_latitude, exact_longitude, reveal) values
  ('10000000-0000-0000-0000-000000000001', '1 Secret Street', 'Hamilton East', -37.78761, 175.29871, 'sale-day'),
  ('10000000-0000-0000-0000-000000000002', '2 Secret Street', 'Claudelands', -37.78123, 175.30456, 'now'),
  ('10000000-0000-0000-0000-000000000003', '3 Secret Street', 'Rototuna', -37.72987, 175.27654, 'area-only'),
  ('10000000-0000-0000-0000-000000000004', '4 Secret Street', 'Frankton', -37.79345, 175.26789, 'now'),
  ('10000000-0000-0000-0000-000000000005', '5 Secret Street', 'Hillcrest', -37.80111, 175.31999, 'now');

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;

-- Friday 9 Oct, 11pm NZ: before the sale.
select pg_temp.check(count(*) = 4, 'drafts are never listed') from private.public_sale_rows('2026-10-09 23:00+13');
select pg_temp.check(address is null and not exact_location and latitude = -37.785 and longitude = 175.295, 'sale-day hides street and exact point before the sale')
  from private.public_sale_rows('2026-10-09 23:00+13') where title = 'Sale day reveal';
select pg_temp.check(address = '2 Secret Street' and exact_location and latitude = -37.78123, 'show-now reveals once published')
  from private.public_sale_rows('2026-10-09 23:00+13') where title = 'Show now';
select pg_temp.check(address is null and town = 'Rototuna' and latitude = -37.725, 'area-only shows town and grid point')
  from private.public_sale_rows('2026-10-09 23:00+13') where title = 'Area only';
select pg_temp.check(address is null and not exact_location, 'closed sales never reveal')
  from private.public_sale_rows('2026-10-09 23:00+13') where title = 'Closed early';

-- 10 Oct 00:30 NZ is still 9 Oct in UTC: the reveal must follow Auckland's date.
select pg_temp.check(address = '1 Secret Street' and exact_location and longitude = 175.29871, 'sale-day reveals on an Auckland sale day')
  from private.public_sale_rows('2026-10-09 11:30Z') where title = 'Sale day reveal';
select pg_temp.check(address = '1 Secret Street', 'sale-day reveals on the second day too')
  from private.public_sale_rows('2026-10-11 07:00+13') where title = 'Sale day reveal';
-- 12 Oct: after the last day, nothing is revealed any more.
select pg_temp.check(count(*) = 0, 'no street after the last sale day')
  from private.public_sale_rows('2026-10-12 07:00+13') where address is not null or exact_location;

-- Buyers (anon) can only use the two functions.
set role anon;
do $$ begin perform 1 from public.sale_private_locations; raise exception 'FAILED: anon read private locations'; exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.sales; raise exception 'FAILED: anon read sales'; exception when insufficient_privilege then null; end $$;
do $$ begin perform private.public_sale_rows(now()); raise exception 'FAILED: anon reached the private schema'; exception when insufficient_privilege then null; end $$;
-- Since 004, buyers use the browse functions (tested in browse_sales.sql); the 002 ones are not callable.
do $$ begin perform public.list_public_sales(); raise exception 'FAILED: anon called list_public_sales'; exception when insufficient_privilege then null; end $$;
do $$ begin perform public.get_public_sale('10000000-0000-0000-0000-000000000003'); raise exception 'FAILED: anon called get_public_sale'; exception when insufficient_privilege then null; end $$;
reset role;

-- Signed-in sellers see only their own private rows and cannot write the derived area point.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check(count(*) = 1 and min(address) = '5 Secret Street', 'seller B sees only their own location') from public.sale_private_locations;
select pg_temp.check(count(*) = 1, 'seller B sees only their own sales') from public.sales;
update public.sale_private_locations set reveal = 'now' where sale_id = '10000000-0000-0000-0000-000000000003';
do $$ begin
  insert into public.sale_private_locations (sale_id, address, town, reveal) values ('10000000-0000-0000-0000-000000000004', 'x', 'y', 'now');
  raise exception 'FAILED: seller B wrote a location onto seller A''s sale';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.sale_private_locations set area_latitude = 0;
  raise exception 'FAILED: area point was writable';
exception when generated_always then null; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check(count(*) = 4, 'seller A sees all four of their locations') from public.sale_private_locations;
reset role;
select pg_temp.check(reveal = 'area-only', 'seller B could not change seller A''s reveal setting')
  from public.sale_private_locations where sale_id = '10000000-0000-0000-0000-000000000003';

\echo 'address privacy: all checks passed'
