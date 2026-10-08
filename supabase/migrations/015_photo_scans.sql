-- Live photo scanning in the Sell flow (app/api/scan). Every answer the AI gives is kept, with the model and
-- instruction version that produced it, so we can see what it got wrong and test better instructions.
-- What the seller kept, renamed or deleted is in sales.items: each suggestion carries an `ai` note of its scan id
-- and original label (lib/ai/scan-items.ts). Sellers can add and read their own scans; there is no update or
-- delete, so the daily scan limit can't be reset. Rows go when the sale or the account is deleted.
begin;
create table public.photo_scans (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  photo_id uuid references public.sale_photos(id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  model text not null check (char_length(model) <= 60),
  prompt_version text not null check (char_length(prompt_version) <= 30),
  result jsonb not null check (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 100000),
  item_count integer not null default 0 check (item_count >= 0),
  ms integer not null default 0 check (ms >= 0),
  cost_usd numeric(10, 6) not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now()
);
create index photo_scans_owner_recent on public.photo_scans(owner_id, created_at desc);
create index photo_scans_photo on public.photo_scans(photo_id);
create index photo_scans_sale on public.photo_scans(sale_id);
alter table public.photo_scans enable row level security;
create policy "owners_read_scans" on public.photo_scans for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners_add_scans" on public.photo_scans for insert to authenticated
  with check ((select auth.uid()) = owner_id
    and exists (select 1 from public.sales s where s.id = sale_id and s.owner_id = (select auth.uid())));
revoke all on public.photo_scans from anon, authenticated;
grant select, insert on public.photo_scans to authenticated;
commit;
