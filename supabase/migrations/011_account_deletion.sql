-- SNAB "delete my account". Apply after 001-010.
-- A signed-in person deletes their own account through public.delete_my_account(). Removing the auth user
-- cascades to everything tied to it: their sales (with days, private locations, photo records, views, saves,
-- reports about them and alert records), their treasure list and alert history. Reports they made about other
-- people's sales stay for safety but lose the link to them. Their coming soon sign-up (same email) goes too.
-- The app removes the photo files from storage first, since stored files don't cascade.
begin;

create function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_email text;
begin
  if me is null then raise exception 'Sign in to delete your account' using errcode = '42501'; end if;
  select email into my_email from auth.users where id = me;
  if my_email is not null then delete from public.interest_signups where lower(email) = lower(my_email); end if;
  delete from auth.users where id = me;
end $$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
commit;
