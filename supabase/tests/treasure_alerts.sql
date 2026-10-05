-- Treasure list and alert checks for 008_treasure_alerts.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.fails(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when others then return true; end $$;
create function pg_temp.nz_today() returns date language sql as $$ select (now() at time zone 'Pacific/Auckland')::date $$;

-- Buyer F and buyer G, and seller H with one published sale and one draft.
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1', 'f@example.nz'), ('00000000-0000-0000-0000-0000000000a2', 'g@example.nz'), ('00000000-0000-0000-0000-0000000000a3', 'h@example.nz');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.treasure_lists (treasures, alerts, stop_token, alerts_from) values ('{"Record player","Drill"}', true, '00000000-0000-0000-0000-000000000000', '2000-01-01');
select pg_temp.check(alerts_from > now() - interval '1 minute' and stop_token <> '00000000-0000-0000-0000-000000000000', 'alert start and stop link are set by the server')
  from public.treasure_lists;
select pg_temp.check(pg_temp.fails($$insert into public.treasure_lists (user_id) values ('00000000-0000-0000-0000-0000000000a2')$$), 'a buyer cannot write someone else''s list');
select pg_temp.check(pg_temp.fails($$update public.treasure_lists set treasures = array_fill('x'::text, array[31])$$), 'a list holds thirty treasures at most');
select pg_temp.check(pg_temp.fails($$update public.treasure_lists set treasures = '{""}'$$), 'blank treasures are rejected');
select pg_temp.check(pg_temp.fails('select public.treasure_alert_work()'), 'buyers cannot read the alert run');
select pg_temp.check(pg_temp.fails('select * from public.treasure_alert_sends'), 'buyers cannot read what was sent');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.check(count(*) = 0, 'buyers see only their own list') from public.treasure_lists;
insert into public.treasure_lists (treasures) values ('{"Drill"}');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
insert into public.sales (id, owner_id, title, status, items, published_at) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a3', 'Shed sale', 'published', '[{"id":"d","label":"Drill"}]', '1999-01-01'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a3', 'Not yet', 'draft', '[]', '1999-01-01');
insert into public.sale_days (sale_id, sale_date, starts, finishes) values
  ('a0000000-0000-0000-0000-000000000001', pg_temp.nz_today() + 2, '08:00', '13:00'), ('a0000000-0000-0000-0000-000000000002', pg_temp.nz_today() + 2, '08:00', '13:00');
insert into public.sale_private_locations (sale_id, address, town, reveal) values
  ('a0000000-0000-0000-0000-000000000001', '7 Hidden Road', 'Frankton', 'sale-day'), ('a0000000-0000-0000-0000-000000000002', '7 Hidden Road', 'Frankton', 'sale-day');
select pg_temp.check(published_at > now() - interval '1 minute', 'the server stamps when a sale goes public')
  from public.sales where id = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.check(published_at is null, 'drafts have no publish time') from public.sales where id = 'a0000000-0000-0000-0000-000000000002';
update public.sales set published_at = now() + interval '1 year', title = 'Shed sale!' where id = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.check(published_at < now() + interval '1 minute', 'the publish time cannot be moved') from public.sales where id = 'a0000000-0000-0000-0000-000000000001';
reset role;

set role anon;
select pg_temp.check(pg_temp.fails('select public.treasure_alert_work()'), 'anon cannot read the alert run');
select pg_temp.check(pg_temp.fails('select * from public.treasure_lists'), 'anon cannot read lists');
reset role;

set role service_role;
select pg_temp.check(jsonb_array_length(w->'watchers') = 1 and w->'watchers'->0->>'email' = 'f@example.nz', 'only buyers with alerts on are watchers')
  from public.treasure_alert_work() w;
select pg_temp.check((select count(*) from jsonb_array_elements(w->'sales') s where s->>'title' in ('Shed sale!', 'Not yet')) = 1, 'only published sales are offered')
  from public.treasure_alert_work() w;
select pg_temp.check(not (w::text like '%Hidden Road%'), 'the street stays out of alerts') from public.treasure_alert_work() w;
select public.record_treasure_alerts('00000000-0000-0000-0000-0000000000a1', '{a0000000-0000-0000-0000-000000000001}');
select public.record_treasure_alerts('00000000-0000-0000-0000-0000000000a1', '{a0000000-0000-0000-0000-000000000001}');
select pg_temp.check((select s->'told' from jsonb_array_elements(w->'sales') s where s->>'title' = 'Shed sale!') = '["00000000-0000-0000-0000-0000000000a1"]', 'sent alerts are remembered once')
  from public.treasure_alert_work() w;
reset role;

select stop_token as f_token from public.treasure_lists where user_id = '00000000-0000-0000-0000-0000000000a1' \gset
set role anon;
select public.stop_treasure_alerts(gen_random_uuid());
reset role;
select pg_temp.check(alerts, 'a wrong stop link changes nothing') from public.treasure_lists where user_id = '00000000-0000-0000-0000-0000000000a1';
set role anon;
select public.stop_treasure_alerts(:'f_token');
reset role;
select pg_temp.check(not alerts and alerts_from is null, 'the stop link turns alerts off') from public.treasure_lists where user_id = '00000000-0000-0000-0000-0000000000a1';
\echo 'treasure alerts: all checks passed'
