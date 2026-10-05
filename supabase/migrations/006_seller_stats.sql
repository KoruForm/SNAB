-- SNAB seller stats: how many people looked at a sale and how many saved it. Apply after 001-005.
-- Buyers' browsers send a random device code (no account, no IP). The server keeps only a one-way hash of
-- that code mixed with the sale (and, for views, the Auckland date), so rows can't be linked across sales
-- or days and nobody can work out who looked. Views count once per device per sale per day.
-- Only the seller can read their own numbers, through public.my_sale_stats().
begin;

create table public.sale_views (
  sale_id uuid not null references public.sales(id) on delete cascade,
  viewed_on date not null,
  visitor text not null,
  primary key (sale_id, viewed_on, visitor)
);
create table public.sale_saves (
  sale_id uuid not null references public.sales(id) on delete cascade,
  visitor text not null,
  primary key (sale_id, visitor)
);
alter table public.sale_views enable row level security;
alter table public.sale_saves enable row level security;
revoke all on public.sale_views, public.sale_saves from public, anon, authenticated;

create function private.visitor_hash(device text, parts text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(device || '|' || parts, 'UTF8')), 'hex')
$$;

-- Counts only sales buyers can see right now, and never the seller looking at their own sale.
create function private.countable_sale(target_sale uuid, device text)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(char_length(device) between 16 and 100, false) and exists (
    select 1 from public.sales s where s.id = target_sale and s.owner_id is distinct from (select auth.uid())
      and private.sale_listed(s.status, array(select sd.sale_date from public.sale_days sd where sd.sale_id = s.id), now()))
$$;
revoke all on all functions in schema private from public, anon, authenticated;

create function public.record_sale_view(target_sale uuid, device text)
returns void language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'Pacific/Auckland')::date;
begin
  if not private.countable_sale(target_sale, device) then return; end if;
  insert into public.sale_views (sale_id, viewed_on, visitor)
  values (target_sale, today, private.visitor_hash(device, target_sale::text || '|' || today::text))
  on conflict do nothing;
end $$;

-- Unsaving always works, even after the sale has finished, so the count stays honest.
create function public.set_sale_saved(target_sale uuid, device text, is_saved boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if is_saved then
    if not private.countable_sale(target_sale, device) then return; end if;
    insert into public.sale_saves (sale_id, visitor) values (target_sale, private.visitor_hash(device, target_sale::text)) on conflict do nothing;
  elsif char_length(device) between 16 and 100 then
    delete from public.sale_saves where sale_id = target_sale and visitor = private.visitor_hash(device, target_sale::text);
  end if;
end $$;

-- No row unless the signed-in user owns the sale.
create function public.my_sale_stats(target_sale uuid)
returns table (views bigint, saves bigint) language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.sale_views v where v.sale_id = s.id), (select count(*) from public.sale_saves sv where sv.sale_id = s.id)
  from public.sales s where s.id = target_sale and s.owner_id = (select auth.uid())
$$;

revoke all on function public.record_sale_view(uuid, text), public.set_sale_saved(uuid, text, boolean), public.my_sale_stats(uuid) from public, anon, authenticated;
grant execute on function public.record_sale_view(uuid, text), public.set_sale_saved(uuid, text, boolean) to anon, authenticated;
grant execute on function public.my_sale_stats(uuid) to authenticated;

commit;
