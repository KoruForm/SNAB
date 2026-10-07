-- Listing limit checks for 010_listing_limits.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.nz_today() returns date language sql as $$ select (now() at time zone 'Pacific/Auckland')::date $$;
-- True when the statement is refused by a limit.
create function pg_temp.refused(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when check_violation then return true; end $$;

insert into auth.users values ('00000000-0000-0000-0000-0000000000a1');
insert into public.sales (id, owner_id, title) values ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Limits');

select pg_temp.check(pg_temp.refused($$update public.sales set highlights = array(select 'thing ' || n from generate_series(1, 31) n) where title = 'Limits'$$), 'more than 30 highlights refused');
select pg_temp.check(pg_temp.refused($$update public.sales set highlights = array[repeat('x', 81)] where title = 'Limits'$$), 'an 81-character highlight refused');
select pg_temp.check(pg_temp.refused($$update public.sales set items = (select jsonb_agg(jsonb_build_object('id', n, 'label', 'x')) from generate_series(1, 41) n) where title = 'Limits'$$), 'more than 40 items refused');
select pg_temp.check(pg_temp.refused($$update public.sales set items = jsonb_build_array(jsonb_build_object('id', 1, 'label', repeat('x', 60000))) where title = 'Limits'$$), 'items over 50 KB refused');
update public.sales set highlights = array(select 'thing ' || n from generate_series(1, 15) n),
  items = (select jsonb_agg(jsonb_build_object('id', n, 'label', 'thing ' || n)) from generate_series(1, 15) n) where title = 'Limits';

select pg_temp.check(pg_temp.refused(format($$insert into public.sale_days (sale_id, sale_date, starts, finishes) values ('a1000000-0000-0000-0000-000000000001', %L, '08:00', '13:00')$$, pg_temp.nz_today() + 184)), 'a date more than six months away refused');
select pg_temp.check(pg_temp.refused(format($$insert into public.sale_days (sale_id, sale_date, starts, finishes) select 'a1000000-0000-0000-0000-000000000001', %L::date + n, '08:00', '13:00' from generate_series(0, 7) n$$, pg_temp.nz_today())), 'eight days refused');
insert into public.sale_days (sale_id, sale_date, starts, finishes)
  select 'a1000000-0000-0000-0000-000000000001', pg_temp.nz_today() + 176 + n, '08:00', '13:00' from generate_series(0, 6) n;
select pg_temp.check((select count(*) from public.sale_days where sale_id = 'a1000000-0000-0000-0000-000000000001') = 7, 'seven days up to six months ahead saved');

insert into public.sales (owner_id) select '00000000-0000-0000-0000-0000000000a1' from generate_series(1, 49);
select pg_temp.check(pg_temp.refused($$insert into public.sales (owner_id) values ('00000000-0000-0000-0000-0000000000a1')$$), 'a 51st sale refused');

select pg_temp.check(pg_temp.refused($$insert into public.sale_photos (sale_id, storage_path)
  select 'a1000000-0000-0000-0000-000000000001', 'limits/' || n from generate_series(1, 21) n$$), 'more than 20 photos refused');
insert into public.sale_photos (sale_id, storage_path)
  select 'a1000000-0000-0000-0000-000000000001', 'limits/' || n from generate_series(1, 20) n;
select pg_temp.check(pg_temp.refused($$insert into public.sale_photos (sale_id, storage_path) values ('a1000000-0000-0000-0000-000000000001', 'limits/21')$$), 'a 21st photo refused');

delete from public.sales where owner_id = '00000000-0000-0000-0000-0000000000a1';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
\echo 'listing limits: all checks passed'
