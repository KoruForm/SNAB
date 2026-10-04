-- SNAB seller draft sync. Apply after 001_seller_foundation.sql.
-- Adds the fields the seller app keeps on a draft, so signed-in sellers can carry drafts across devices.
-- Owner-only access is unchanged; this migration adds no public reads.
begin;
alter table public.sales
  add column items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  add column demo_scan boolean not null default false,
  add column event_code text check (char_length(event_code) <= 20),
  add column day_mode text check (day_mode in ('auto', 'open', 'closed')),
  add column abundance text check (abundance in ('lots', 'some-gone'));
alter table public.sale_photos
  add column file_name text not null default '' check (char_length(file_name) <= 255),
  add column content_type text not null default '' check (char_length(content_type) <= 100);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger sales_touch_updated_at before update on public.sales
  for each row execute function public.touch_updated_at();

-- Replace a sale's days in one transaction. Runs as the caller, so the owner policies still apply.
create function public.replace_sale_days(p_sale_id uuid, p_days jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.sale_days where sale_id = p_sale_id;
  insert into public.sale_days (sale_id, sale_date, starts, finishes)
    select p_sale_id, d.sale_date, d.starts, d.finishes
    from jsonb_to_recordset(coalesce(p_days, '[]'::jsonb)) as d(sale_date date, starts time, finishes time);
end;
$$;
revoke all on function public.replace_sale_days(uuid, jsonb) from public, anon;
grant execute on function public.replace_sale_days(uuid, jsonb) to authenticated;

-- A photo record may only point at a file inside the owner's own <user-id>/<sale-id>/ folder.
drop policy "owners_manage_photo_records" on public.sale_photos;
create policy "owners_manage_photo_records" on public.sale_photos for all to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid()))
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and split_part(storage_path, '/', 2) = sale_id::text);
commit;
