-- SNAB photo limit. Apply after 001-011.
-- Keeps each sale to 20 photos in the database as well as in the app, so a client that skips the app's check
-- still can't fill storage with one listing.
begin;
create function private.limit_sale_photos() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.sale_photos where sale_id = new.sale_id) > 20 then
    raise exception 'Keep each sale to 20 photos' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger sale_photos_limit after insert or update of sale_id on public.sale_photos
  for each row execute function private.limit_sale_photos();

revoke all on all functions in schema private from public, anon, authenticated;
commit;
