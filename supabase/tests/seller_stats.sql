-- Seller stats checks for 006_seller_stats.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.fails(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when others then return true; end $$;
create function pg_temp.nz_today() returns date language sql as $$ select (now() at time zone 'Pacific/Auckland')::date $$;

-- Seller S: one listed sale and one draft.
insert into auth.users values ('00000000-0000-0000-0000-00000000005e'), ('00000000-0000-0000-0000-0000000000b0');
insert into public.sales (id, owner_id, title, status) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000005e', 'Listed', 'published'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000005e', 'Draft', 'draft');
insert into public.sale_days (sale_id, sale_date, starts, finishes) values
  ('60000000-0000-0000-0000-000000000001', pg_temp.nz_today() + 2, '08:00', '13:00'),
  ('60000000-0000-0000-0000-000000000002', pg_temp.nz_today() + 2, '08:00', '13:00');

set role anon;
select public.record_sale_view('60000000-0000-0000-0000-000000000001', 'device-aaaaaaaaaaaaaaaa');
select public.record_sale_view('60000000-0000-0000-0000-000000000001', 'device-aaaaaaaaaaaaaaaa');
select public.record_sale_view('60000000-0000-0000-0000-000000000001', 'device-bbbbbbbbbbbbbbbb');
select public.record_sale_view('60000000-0000-0000-0000-000000000002', 'device-aaaaaaaaaaaaaaaa');
select public.record_sale_view('60000000-0000-0000-0000-000000000001', 'short');
select public.set_sale_saved('60000000-0000-0000-0000-000000000001', 'device-aaaaaaaaaaaaaaaa', true);
select public.set_sale_saved('60000000-0000-0000-0000-000000000001', 'device-aaaaaaaaaaaaaaaa', true);
select public.set_sale_saved('60000000-0000-0000-0000-000000000001', 'device-bbbbbbbbbbbbbbbb', true);
select public.set_sale_saved('60000000-0000-0000-0000-000000000001', 'device-bbbbbbbbbbbbbbbb', false);
select public.set_sale_saved('60000000-0000-0000-0000-000000000002', 'device-aaaaaaaaaaaaaaaa', true);
select pg_temp.check(pg_temp.fails('select * from public.sale_views'), 'anon cannot read views');
select pg_temp.check(pg_temp.fails('select * from public.sale_saves'), 'anon cannot read saves');
select pg_temp.check(pg_temp.fails('insert into public.sale_views values (''60000000-0000-0000-0000-000000000001'', current_date, ''x'')'), 'anon cannot add views directly');
select pg_temp.check(pg_temp.fails('select * from public.my_sale_stats(''60000000-0000-0000-0000-000000000001'')'), 'anon cannot read stats');
reset role;

-- The seller opening their own sale doesn't count.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000005e';
select public.record_sale_view('60000000-0000-0000-0000-000000000001', 'device-cccccccccccccccc');
select pg_temp.check(views = 2 and saves = 1, 'seller sees views once per device per day and current saves')
  from public.my_sale_stats('60000000-0000-0000-0000-000000000001');
select pg_temp.check(views = 0 and saves = 0, 'drafts collect nothing') from public.my_sale_stats('60000000-0000-0000-0000-000000000002');
select pg_temp.check(pg_temp.fails('select * from public.sale_views'), 'signed-in users cannot read raw views');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b0';
select pg_temp.check(count(*) = 0, 'other people get no stats') from public.my_sale_stats('60000000-0000-0000-0000-000000000001');
reset request.jwt.claim.sub;
reset role;

select pg_temp.check(not exists (select 1 from public.sale_views where visitor like '%device%'), 'device codes are never stored as sent');
select pg_temp.check((select count(distinct visitor) from public.sale_views) = 2, 'each device is one hashed visitor');

\echo 'seller stats: all checks passed'
