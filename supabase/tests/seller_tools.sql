-- Seller tools checks for 013_seller_tools.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.fails(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when others then return true; end $$;
create function pg_temp.nz_today() returns date language sql as $$ select (now() at time zone 'Pacific/Auckland')::date $$;

insert into public.partners (code, name, kind, blurb, website) values
  ('acme-realty', 'Acme Realty', 'agent', 'Moving? List your sale free.', 'https://example.com'),
  ('gone-co', 'Gone Co', 'mover', '', '');
update public.partners set active = false where code = 'gone-co';

-- Seller S has a listed sale with a tools highlight; buyers A, B and C keep treasure lists.
insert into auth.users values ('00000000-0000-0000-0000-0000000013a5'), ('00000000-0000-0000-0000-0000000013a1'),
  ('00000000-0000-0000-0000-0000000013a2'), ('00000000-0000-0000-0000-0000000013a3');
insert into public.sales (id, owner_id, title, status, highlights, items, details, partner_code) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000013a5', 'Shed clear-out', 'published', '{Cordless drill}',
   '[{"id":"d","label":"Cordless drill","category":"Tools","description":"Battery drill","available":true,"confirmed":true},
     {"id":"k","label":"Kayak","category":"Other","description":"Sit-on kayak","available":false,"confirmed":true}]',
   '{"saleType":"moving","payment":["cash"],"earlyBirds":"no"}', 'acme-realty'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000013a5', 'Old partner', 'draft', '{}', '[]', '{}', 'gone-co');
insert into public.sale_private_locations (sale_id, address, town) values
  ('70000000-0000-0000-0000-000000000001', '1 Test St', 'Hillcrest'), ('70000000-0000-0000-0000-000000000002', '1 Test St', 'Hillcrest');
insert into public.sale_days (sale_id, sale_date, starts, finishes) values ('70000000-0000-0000-0000-000000000001', pg_temp.nz_today() + 1, '08:00', '13:00');
insert into public.treasure_lists (user_id, treasures) values
  ('00000000-0000-0000-0000-0000000013a1', '{"Cordless drill", "kayak", "Grandma''s brooch"}'),
  ('00000000-0000-0000-0000-0000000013a2', '{"cordless  drill", "Kayak"}'),
  ('00000000-0000-0000-0000-0000000013a3', '{"old drill", "vintage"}');

select pg_temp.check(partner_code is null, 'an inactive partner code is dropped') from public.sales where id = '70000000-0000-0000-0000-000000000002';
select pg_temp.check(pg_temp.fails('update public.sales set details = ''[]'' where id = ''70000000-0000-0000-0000-000000000001'''), 'details must be an object');
select pg_temp.check(pg_temp.fails($$update public.sales set details = jsonb_build_object('note', repeat('x', 5000)) where id = '70000000-0000-0000-0000-000000000001'$$), 'details stay small');
select pg_temp.check(pg_temp.fails($$insert into public.partners (code, name) values ('Bad Code', 'x')$$), 'partner codes are lower-case slugs');

select pg_temp.check(private.treasure_hits('cordless drill', '{"Cordless drills Tools"}'), 'plurals match');
select pg_temp.check(private.treasure_hits('old drill', '{"Cordless drill Tools"}'), 'describing words are skipped when there is a main word');
select pg_temp.check(not private.treasure_hits('vintage', '{"Cordless drill Tools"}'), 'a describing word alone must match itself');
select pg_temp.check(not private.treasure_hits('drill press', '{"Cordless drill Tools", "Printing press"}'), 'every word has to be in the same highlight');

set role anon;
select pg_temp.check(details->>'saleType' = 'moving' and partner->>'name' = 'Acme Realty', 'buyers see details and the partner name')
  from public.browse_sale('70000000-0000-0000-0000-000000000001');
select pg_temp.check(count(*) = 1 and min(name) = 'Acme Realty', 'active partner info is public') from public.partner_info('ACME-REALTY');
select pg_temp.check(count(*) = 0, 'inactive partners are not shown') from public.partner_info('gone-co');
select pg_temp.check(pg_temp.fails('select * from public.partners'), 'anon cannot read the partners table');
select pg_temp.check(pg_temp.fails('select * from public.partner_sales'), 'anon cannot read the partner report');
select pg_temp.check((select array_agg(treasure || ':' || lists order by treasure) from public.treasure_demand()) = '{cordless drill:2,kayak:2}',
  'demand shows only treasures on two or more lists, merged regardless of case and spacing');
select pg_temp.check(pg_temp.fails('select public.my_sale_treasure_lists(''70000000-0000-0000-0000-000000000001'')'), 'anon cannot count lists');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000013a5';
-- A and B want drills; C's "old drill" matches too. Nobody's kayak counts, because the kayak has gone.
select pg_temp.check(public.my_sale_treasure_lists('70000000-0000-0000-0000-000000000001') = 3, 'seller sees how many lists the sale is on');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000013a1';
select pg_temp.check(public.my_sale_treasure_lists('70000000-0000-0000-0000-000000000001') = 0, 'other people get no count');
reset request.jwt.claim.sub;
reset role;

select pg_temp.check(sales_started = 1 and sales_published = 1, 'partner report counts the sale') from public.partner_sales where code = 'acme-realty';

\echo 'seller tools: all checks passed'
