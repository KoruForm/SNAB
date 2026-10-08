-- Photo scan checks for 015_photo_scans.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.fails(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when others then return true; end $$;

-- Seller A owns a sale with a photo; seller B owns nothing.
insert into auth.users values ('00000000-0000-0000-0000-0000000005ca'), ('00000000-0000-0000-0000-0000000005cb');
insert into public.sales (id, owner_id, title) values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005ca', 'Scan me');
insert into public.sale_photos (id, sale_id, storage_path) values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005ca/70000000-0000-0000-0000-000000000001/p.jpg');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005ca';
insert into public.photo_scans (sale_id, photo_id, owner_id, model, prompt_version, result, item_count)
  values ('70000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000005ca', 'claude-haiku-5-5', '2026-10-08', '{"summary":"","items":[],"privacy_flags":[]}', 0);
select pg_temp.check((select count(*) from public.photo_scans) = 1, 'seller reads their own scan');
select pg_temp.check(pg_temp.fails('delete from public.photo_scans'), 'seller cannot delete scans to reset the daily limit');
select pg_temp.check(pg_temp.fails('insert into public.photo_scans (sale_id, model, prompt_version, result) values (''70000000-0000-0000-0000-000000000001'', ''m'', ''v'', ''[]'')'), 'scan result must be an object');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000005cb';
select pg_temp.check((select count(*) from public.photo_scans) = 0, 'another seller cannot read the scan');
select pg_temp.check(pg_temp.fails('insert into public.photo_scans (sale_id, model, prompt_version, result) values (''70000000-0000-0000-0000-000000000001'', ''m'', ''v'', ''{}'')'), 'another seller cannot add scans to the sale');
reset role;

set role anon;
select pg_temp.check(pg_temp.fails('select * from public.photo_scans'), 'anon cannot read scans');
reset role;

-- Deleting the sale removes its scans.
delete from public.sales where id = '70000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) from public.photo_scans) = 0, 'scans go with their sale');
\echo 'photo scans: all checks passed'
