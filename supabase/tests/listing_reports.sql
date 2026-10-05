-- Listing report checks for 006_listing_reports.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.nz_today() returns date language sql as $$ select (now() at time zone 'Pacific/Auckland')::date $$;

-- Seller F has one listed sale (with a photo) and one draft. G, H and I are buyers.
insert into auth.users values ('00000000-0000-0000-0000-00000000000f'), ('00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000011'), ('00000000-0000-0000-0000-000000000012');
insert into public.sales (id, owner_id, title, status) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f', 'Reported sale', 'published'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000f', 'Report draft', 'draft');
insert into public.sale_days (sale_id, sale_date, starts, finishes)
  select id, pg_temp.nz_today() + 2, '08:00', '13:00' from public.sales where id::text like '40000000-%';
insert into public.sale_private_locations (sale_id, address, town, exact_latitude, exact_longitude, reveal)
  select id, '1 Report Road', 'Hamilton', -37.78, 175.28, 'sale-day' from public.sales where id::text like '40000000-%';
insert into public.sale_photos (sale_id, storage_path, sort_order, file_name, content_type) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000f/40000000-0000-0000-0000-000000000001/a.jpg', 0, 'a.jpg', 'image/jpeg');
insert into storage.objects (bucket_id, name) select 'sale-photos', storage_path from public.sale_photos where sale_id::text like '40000000-%';

-- Someone not signed in reports twice from one browser, and once from another: two reports, no auto-hide.
set role anon;
select public.report_sale('40000000-0000-0000-0000-000000000001', 'wrong-details', 'Wrong date', 'browser-1');
select public.report_sale('40000000-0000-0000-0000-000000000001', 'other', '', 'browser-1');
select public.report_sale('40000000-0000-0000-0000-000000000001', 'unsafe', '', 'browser-2');
select public.report_sale('40000000-0000-0000-0000-000000000001', 'unsafe', '', 'browser-3');
select public.report_sale('40000000-0000-0000-0000-000000000002', 'offensive', '', 'browser-1');
do $$ begin perform 1 from public.sale_reports; raise exception 'FAILED: anon can read reports'; exception when insufficient_privilege then null; end $$;
do $$ begin perform 1 from public.reports_to_review; raise exception 'FAILED: anon can read the review list'; exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.check(count(*) = 3, 'one report per browser, and none for a sale buyers cannot see')
  from public.sale_reports where sale_id::text like '40000000-%';
select pg_temp.check(not hidden, 'reports from people not signed in never auto-hide') from public.sales where id = '40000000-0000-0000-0000-000000000001';
do $$ begin
  insert into public.sale_reports (sale_id, reason) values ('40000000-0000-0000-0000-000000000001', 'made-up');
  raise exception 'FAILED: an unknown reason was accepted';
exception when check_violation then null; end $$;

-- The seller cannot hide or unhide their own sale.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
update public.sales set hidden = true where id = '40000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.check(not hidden, 'a seller cannot change hidden') from public.sales where id = '40000000-0000-0000-0000-000000000001';

-- Two signed-in reports (one repeated): still listed. The third different account hides it.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';
select public.report_sale('40000000-0000-0000-0000-000000000001', 'unsafe', '', null);
select public.report_sale('40000000-0000-0000-0000-000000000001', 'unsafe', '', null);
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000011';
select public.report_sale('40000000-0000-0000-0000-000000000001', 'offensive', '', null);
select pg_temp.check(count(*) = 1, 'two signed-in reports leave the sale listed') from public.browse_sale('40000000-0000-0000-0000-000000000001');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000012';
select public.report_sale('40000000-0000-0000-0000-000000000001', 'not-running', '', null);
select pg_temp.check(count(*) = 0, 'three signed-in reports hide the sale') from public.browse_sale('40000000-0000-0000-0000-000000000001');
select pg_temp.check(count(*) = 0, 'a hidden sale is not in the list') from public.browse_sales() where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check(count(*) = 0, 'buyers cannot read photos of a hidden sale')
  from storage.objects where name like '%/40000000-0000-0000-0000-000000000001/%';
-- The seller still sees their own sale, marked hidden.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
select pg_temp.check(hidden, 'the seller can see their sale is hidden') from public.sales where id = '40000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.check(hidden_at is not null, 'hiding records when') from public.sales where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check(count(*) = 6 and bool_and(open_reports_for_sale = 6), 'the review list shows every report with its count')
  from public.reports_to_review where sale_id = '40000000-0000-0000-0000-000000000001';

-- Restoring it in the dashboard brings it back and clears the open reports.
update public.sales set hidden = false where id = '40000000-0000-0000-0000-000000000001';
select pg_temp.check(count(*) = 0, 'restoring dismisses open reports')
  from public.sale_reports where sale_id = '40000000-0000-0000-0000-000000000001' and status = 'open';
set role anon;
select pg_temp.check(count(*) = 1, 'a restored sale is listed again') from public.browse_sale('40000000-0000-0000-0000-000000000001');
reset role;
-- Josh can also hide a sale by hand.
update public.sales set hidden = true where id = '40000000-0000-0000-0000-000000000001';
set role anon;
select pg_temp.check(count(*) = 0, 'a sale hidden by hand drops out') from public.browse_sale('40000000-0000-0000-0000-000000000001');
reset role;
\echo 'listing reports: all checks passed'
