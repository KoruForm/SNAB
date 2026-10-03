-- SNAB seller foundation. Apply to a new Supabase project after it is connected.
-- Owner-only access. No public sale reads or public storage buckets in this migration.
begin;
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 100),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  categories text[] not null default '{}',
  highlights text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sale_days (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  sale_date date not null,
  starts time not null,
  finishes time not null,
  timezone text not null default 'Pacific/Auckland' check (timezone = 'Pacific/Auckland'),
  unique (sale_id, sale_date),
  check (finishes > starts)
);
-- Exact location is never part of the general sale record.
create table public.sale_private_locations (
  sale_id uuid primary key references public.sales(id) on delete cascade,
  address text not null check (char_length(address) <= 200),
  town text not null check (char_length(town) <= 100),
  exact_latitude double precision check (exact_latitude between -90 and 90),
  exact_longitude double precision check (exact_longitude between -180 and 180),
  reveal text not null default 'sale-day' check (reveal in ('sale-day', 'now', 'area-only'))
);
create table public.sale_photos (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0,
  analysis_state text not null default 'not-queued' check (analysis_state in ('not-queued', 'queued', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);
create index sales_owner on public.sales(owner_id);
create index sale_days_sale on public.sale_days(sale_id);
create index sale_photos_sale on public.sale_photos(sale_id);
alter table public.sales enable row level security;
alter table public.sale_days enable row level security;
alter table public.sale_private_locations enable row level security;
alter table public.sale_photos enable row level security;
create policy "owners_manage_sales" on public.sales for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners_manage_days" on public.sale_days for all to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())));
create policy "owners_manage_private_locations" on public.sale_private_locations for all to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())));
create policy "owners_manage_photo_records" on public.sale_photos for all to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())));
revoke all on public.sales, public.sale_days, public.sale_private_locations, public.sale_photos from anon;
grant select, insert, update, delete on public.sales, public.sale_days, public.sale_private_locations, public.sale_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sale-photos', 'sale-photos', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif']);
-- Folder format: <authenticated-user-id>/<sale-id>/<photo-id>.<extension>.
-- Check ownership of the referenced sale too; a folder name alone is not sufficient.
create policy "owners_read_sale_photo_files" on storage.objects for select to authenticated
  using (bucket_id = 'sale-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.sales s where s.id::text = (storage.foldername(name))[2] and s.owner_id = (select auth.uid())));
create policy "owners_upload_sale_photo_files" on storage.objects for insert to authenticated
  with check (bucket_id = 'sale-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.sales s where s.id::text = (storage.foldername(name))[2] and s.owner_id = (select auth.uid())));
create policy "owners_update_sale_photo_files" on storage.objects for update to authenticated
  using (bucket_id = 'sale-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.sales s where s.id::text = (storage.foldername(name))[2] and s.owner_id = (select auth.uid())))
  with check (bucket_id = 'sale-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.sales s where s.id::text = (storage.foldername(name))[2] and s.owner_id = (select auth.uid())));
create policy "owners_delete_sale_photo_files" on storage.objects for delete to authenticated
  using (bucket_id = 'sale-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.sales s where s.id::text = (storage.foldername(name))[2] and s.owner_id = (select auth.uid())));
commit;
