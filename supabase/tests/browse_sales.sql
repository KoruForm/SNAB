-- Buyer browsing checks for 004_buyer_browse.sql. Run by scripts/test-db.sh; any failed check raises.
-- Dates are relative to today in Auckland so the checks hold whenever they run.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.nz_today() returns date language sql as $$ select (now() at time zone 'Pacific/Auckland')::date $$;

-- Seller E: one upcoming sale (two photos), one that finished yesterday, one closed today, one draft.
insert into auth.users values ('00000000-0000-0000-0000-00000000000e');
insert into public.sales (id, owner_id, title, status, items, event_code, day_mode, abundance) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'Upcoming', 'published', '[{"id":"drill","label":"Drill"}]', 'HAMILTON', 'auto', 'lots'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'Finished', 'published', '[]', null, null, null),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000e', 'Closed today', 'closed', '[]', null, null, null),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000e', 'Draft', 'draft', '[]', null, null, null);
insert into public.sale_days (sale_id, sale_date, starts, finishes) values
  ('30000000-0000-0000-0000-000000000001', pg_temp.nz_today() + 3, '08:00', '13:00'),
  ('30000000-0000-0000-0000-000000000002', pg_temp.nz_today() - 1, '08:00', '13:00'),
  ('30000000-0000-0000-0000-000000000003', pg_temp.nz_today(), '08:00', '13:00'),
  ('30000000-0000-0000-0000-000000000004', pg_temp.nz_today() + 3, '08:00', '13:00');
insert into public.sale_private_locations (sale_id, address, town, exact_latitude, exact_longitude, reveal)
  select id, '9 Secret Street', 'Hamilton East', -37.78761, 175.29871, 'sale-day' from public.sales where owner_id = '00000000-0000-0000-0000-00000000000e';
insert into public.sale_photos (sale_id, storage_path, sort_order, file_name, content_type) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e/30000000-0000-0000-0000-000000000001/b.jpg', 1, 'b.jpg', 'image/jpeg'),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e/30000000-0000-0000-0000-000000000001/a.jpg', 0, 'a.jpg', 'image/jpeg'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e/30000000-0000-0000-0000-000000000002/c.jpg', 0, 'c.jpg', 'image/jpeg'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000e/30000000-0000-0000-0000-000000000004/d.jpg', 0, 'd.jpg', 'image/jpeg');
insert into storage.objects (bucket_id, name) select 'sale-photos', storage_path from public.sale_photos where sale_id::text like '30000000-%';

set role anon;
select pg_temp.check(count(*) = 2, 'only upcoming and still-current sales are listed')
  from public.browse_sales() where title in ('Upcoming', 'Finished', 'Closed today', 'Draft');
select pg_temp.check(count(*) = 0, 'a sale drops off after its last day') from public.browse_sales() where title = 'Finished';
select pg_temp.check(address is null and not exact_location and latitude = -37.785, 'browse keeps the address hidden before sale day')
  from public.browse_sales() where title = 'Upcoming';
select pg_temp.check(items->0->>'label' = 'Drill' and event_code = 'HAMILTON' and abundance = 'lots', 'browse carries highlights and sale-day state')
  from public.browse_sale('30000000-0000-0000-0000-000000000001');
select pg_temp.check(jsonb_array_length(photos) = 2 and photos->0->>'name' = 'a.jpg', 'photos are listed in order')
  from public.browse_sale('30000000-0000-0000-0000-000000000001');
select pg_temp.check(count(*) = 0, 'a draft is not readable by id') from public.browse_sale('30000000-0000-0000-0000-000000000004');
-- Storage: a listed sale's photos are readable; finished and draft sales' photos are not.
select pg_temp.check(count(*) = 2, 'buyers can read photos of a listed sale')
  from storage.objects where name like '%/30000000-0000-0000-0000-000000000001/%';
select pg_temp.check(count(*) = 0, 'buyers cannot read photos of finished or draft sales')
  from storage.objects where name like '%/30000000-0000-0000-0000-000000000002/%' or name like '%/30000000-0000-0000-0000-000000000004/%';
reset role;
\echo 'buyer browsing: all checks passed'
