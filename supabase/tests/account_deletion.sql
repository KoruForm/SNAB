-- Account deletion checks for 011_account_deletion.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.fails(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when others then return true; end $$;

-- Two people: D deletes their account, K keeps theirs. D has a sale, a treasure list, a sign-up, and reported K's sale.
insert into auth.users values ('00000000-0000-0000-0000-0000000000d1', 'Dee@Example.com'), ('00000000-0000-0000-0000-0000000000d2', 'kay@example.com');
insert into public.sales (id, owner_id, title) values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'Dee sale'),
  ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d2', 'Kay sale');
insert into public.sale_private_locations (sale_id, address, town) values ('d1000000-0000-0000-0000-000000000001', '1 Dee Street', 'Hamilton');
insert into public.treasure_lists (user_id, treasures) values ('00000000-0000-0000-0000-0000000000d1', '{drill}'), ('00000000-0000-0000-0000-0000000000d2', '{lamp}');
insert into public.interest_signups (email) values ('dee@example.com'), ('kay@example.com');
insert into public.sale_reports (sale_id, reporter_id, reason) values ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'other');

select pg_temp.check(pg_temp.fails('select public.delete_my_account()'), 'nobody can delete an account without signing in');
set role anon;
select pg_temp.check(pg_temp.fails('select public.delete_my_account()'), 'anon cannot call it');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select public.delete_my_account();
reset request.jwt.claim.sub;
reset role;

select pg_temp.check(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d1'), 'the account is gone');
select pg_temp.check(not exists (select 1 from public.sales where owner_id = '00000000-0000-0000-0000-0000000000d1'), 'their sales are gone');
select pg_temp.check(not exists (select 1 from public.sale_private_locations where sale_id = 'd1000000-0000-0000-0000-000000000001'), 'their address is gone');
select pg_temp.check(not exists (select 1 from public.treasure_lists where user_id = '00000000-0000-0000-0000-0000000000d1'), 'their treasure list is gone');
select pg_temp.check(not exists (select 1 from public.interest_signups where lower(email) = 'dee@example.com'), 'their sign-up is gone, whatever the case of the email');
select pg_temp.check((select reporter_id from public.sale_reports where sale_id = 'd2000000-0000-0000-0000-000000000001') is null, 'their report stays, unlinked');
select pg_temp.check(exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d2')
  and exists (select 1 from public.sales where owner_id = '00000000-0000-0000-0000-0000000000d2')
  and exists (select 1 from public.treasure_lists where user_id = '00000000-0000-0000-0000-0000000000d2')
  and exists (select 1 from public.interest_signups where email = 'kay@example.com'), 'everyone else is untouched');

delete from public.sales where owner_id = '00000000-0000-0000-0000-0000000000d2';
delete from public.interest_signups where email = 'kay@example.com';
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d2';
\echo 'account deletion: all checks passed'
