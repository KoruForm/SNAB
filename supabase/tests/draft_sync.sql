-- Account draft checks for 003_seller_draft_sync.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Seller C owns one draft; seller D tries to reach it.
insert into auth.users values ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.sales (id, owner_id, updated_at) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '2026-01-01');
insert into public.sale_private_locations (sale_id, address, town) values ('20000000-0000-0000-0000-000000000001', '', '');
select public.replace_sale_days('20000000-0000-0000-0000-000000000001', '[{"sale_date":"2026-10-10","starts":"08:00","finishes":"13:00"},{"sale_date":"2026-10-11","starts":"09:00","finishes":"12:00"}]');
select public.replace_sale_days('20000000-0000-0000-0000-000000000001', '[{"sale_date":"2026-10-12","starts":"08:00","finishes":"13:00"}]');
select pg_temp.check(count(*) = 1 and min(sale_date) = '2026-10-12', 'replace_sale_days replaces every day') from public.sale_days where sale_id = '20000000-0000-0000-0000-000000000001';
update public.sales set title = 'Shed clearout', items = '[{"id":"drill"}]', event_code = 'HAMILTON', day_mode = 'open', abundance = 'lots' where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.check(updated_at > '2026-01-02', 'updates move updated_at') from public.sales where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  update public.sales set items = '{}' where id = '20000000-0000-0000-0000-000000000001';
  raise exception 'FAILED: items accepted a non-array';
exception when check_violation then null; end $$;
insert into public.sale_photos (sale_id, storage_path, file_name, content_type)
  values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c/20000000-0000-0000-0000-000000000001/p1.jpg', 'p1.jpg', 'image/jpeg');
do $$ begin
  insert into public.sale_photos (sale_id, storage_path) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d/20000000-0000-0000-0000-000000000001/p2.jpg');
  raise exception 'FAILED: a photo record pointed outside the owner''s folder';
exception when insufficient_privilege then null; end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select pg_temp.check(count(*) = 0, 'seller D cannot see seller C''s photos') from public.sale_photos;
do $$ begin
  perform public.replace_sale_days('20000000-0000-0000-0000-000000000001', '[{"sale_date":"2026-10-13","starts":"08:00","finishes":"13:00"}]');
  raise exception 'FAILED: seller D replaced seller C''s days';
exception when insufficient_privilege then null; end $$;
reset role;
select pg_temp.check(count(*) = 1 and min(sale_date) = '2026-10-12', 'seller C''s days survive seller D''s attempt') from public.sale_days where sale_id = '20000000-0000-0000-0000-000000000001';

set role anon;
do $$ begin
  perform public.replace_sale_days('20000000-0000-0000-0000-000000000001', '[]');
  raise exception 'FAILED: anon called replace_sale_days';
exception when insufficient_privilege then null; end $$;
reset role;

\echo 'draft sync: all checks passed'
