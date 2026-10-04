-- Interest list checks for 005_interest_signups.sql. Run by scripts/test-db.sh; any failed check raises.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.fails(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when others then return true; end $$;

set role anon;
select public.register_interest('  Kia.Ora@Example.nz ', 'selling', 'Hamilton East');
select public.register_interest('kia.ora@example.nz', 'buying', '');
select pg_temp.check(pg_temp.fails('select * from public.interest_signups'), 'anon cannot read the list');
select pg_temp.check(pg_temp.fails('insert into public.interest_signups (email) values (''a@b.co'')'), 'anon cannot insert directly');
select pg_temp.check(pg_temp.fails('select public.register_interest(''not-an-email'')'), 'bad emails are rejected');
select pg_temp.check(pg_temp.fails('select public.register_interest(''a@b.co'', ''lurking'')'), 'unknown interest is rejected');
reset role;

set role authenticated;
select pg_temp.check(pg_temp.fails('select * from public.interest_signups'), 'signed-in users cannot read the list');
reset role;

select pg_temp.check((select count(*) from public.interest_signups) = 1, 'a repeat signup is kept once');
select pg_temp.check((select email = 'kia.ora@example.nz' and interest = 'selling' and suburb = 'Hamilton East' from public.interest_signups), 'first signup is stored tidied');

\echo 'interest list: all checks passed'
