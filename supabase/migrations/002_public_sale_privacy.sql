-- SNAB public sale reads with server-enforced address privacy. Apply after 001_seller_foundation.sql.
-- Buyers never read sales, sale_days or sale_private_locations directly. Their only path is
-- public.list_public_sales() and public.get_public_sale(), which return the street and exact
-- coordinates only while the seller's reveal setting allows it, and a coarse area point otherwise.
begin;

-- Coarse map position: the centre of the 0.01 degree grid cell holding the exact point
-- (about 1.1 km north-south, 0.9 km east-west in Waikato). Generated, so no client can set it.
alter table public.sale_private_locations
  add column area_latitude double precision generated always as ((floor(exact_latitude * 100) + 0.5) / 100) stored,
  add column area_longitude double precision generated always as ((floor(exact_longitude * 100) + 0.5) / 100) stored;

-- Not exposed through the Data API; only the security definer functions below reach it.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- The reveal rule, in the sale's own time zone. Mirrored by addressVisible() in lib/drafts/types.ts.
-- 'now': from publication until the last sale day ends. 'sale-day': on sale days only. 'area-only': never.
-- A closed sale or a draft never reveals the street.
create function private.address_visible(sale_status text, reveal text, sale_dates date[], at_time timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(sale_status = 'published' and case reveal
    when 'now' then (at_time at time zone 'Pacific/Auckland')::date <= (select max(d) from unnest(sale_dates) d)
    when 'sale-day' then (at_time at time zone 'Pacific/Auckland')::date = any(sale_dates)
    else false
  end, false)
$$;

create function private.public_sale_rows(at_time timestamptz)
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean
) language sql stable set search_path = '' as $$
  select s.id, s.title, s.description, s.status, s.categories, s.highlights, coalesce(d.days, '[]'::jsonb),
    l.town,
    case when v.visible then l.address end,
    case when v.visible then l.exact_latitude else l.area_latitude end,
    case when v.visible then l.exact_longitude else l.area_longitude end,
    v.visible
  from public.sales s
  join public.sale_private_locations l on l.sale_id = s.id
  left join lateral (
    select jsonb_agg(jsonb_build_object('date', sd.sale_date, 'starts', to_char(sd.starts, 'HH24:MI'), 'finishes', to_char(sd.finishes, 'HH24:MI')) order by sd.sale_date) as days,
      array_agg(sd.sale_date) as dates
    from public.sale_days sd where sd.sale_id = s.id
  ) d on true
  cross join lateral (select private.address_visible(s.status, l.reveal, d.dates, at_time) as visible) v
  where s.status in ('published', 'closed')
$$;

revoke all on all functions in schema private from public, anon, authenticated;

create function public.list_public_sales()
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean
) language sql stable security definer set search_path = '' as $$
  select * from private.public_sale_rows(now())
$$;

create function public.get_public_sale(sale_id uuid)
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean
) language sql stable security definer set search_path = '' as $$
  select * from private.public_sale_rows(now()) r where r.id = get_public_sale.sale_id
$$;

revoke all on function public.list_public_sales(), public.get_public_sale(uuid) from public, anon, authenticated;
grant execute on function public.list_public_sales(), public.get_public_sale(uuid) to anon, authenticated;
commit;
