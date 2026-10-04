-- SNAB buyer browsing. Apply after 001-003.
-- Buyers now read published sales through public.browse_sales() and public.browse_sale(id), which add the
-- seller's highlights, sale-day state and photo list to the address-safe rows from 002, and drop a sale
-- once its last sale day has passed (Pacific/Auckland date). Photos of a listed sale become readable
-- through short-lived signed links; drafts' and finished sales' photos stay owner-only.
begin;

-- Listed: published or closed, with a sale day today or later in Auckland.
create function private.sale_listed(sale_status text, sale_dates date[], at_time timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(sale_status in ('published', 'closed')
    and (select max(d) from unnest(sale_dates) d) >= (at_time at time zone 'Pacific/Auckland')::date, false)
$$;

create function private.browse_sale_rows(at_time timestamptz)
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean,
  items jsonb, event_code text, day_mode text, abundance text, photos jsonb
) language sql stable set search_path = '' as $$
  select r.id, r.title, r.description, r.status, r.categories, r.highlights, r.days,
    r.town, r.address, r.latitude, r.longitude, r.exact_location,
    s.items, s.event_code, s.day_mode, s.abundance,
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'path', p.storage_path, 'name', p.file_name, 'type', p.content_type) order by p.sort_order, p.created_at)
      from public.sale_photos p where p.sale_id = r.id), '[]'::jsonb)
  from private.public_sale_rows(at_time) r
  join public.sales s on s.id = r.id
  where private.sale_listed(r.status, array(select (d->>'date')::date from jsonb_array_elements(r.days) d), at_time)
$$;

revoke all on all functions in schema private from public, anon, authenticated;

create function public.browse_sales()
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean,
  items jsonb, event_code text, day_mode text, abundance text, photos jsonb
) language sql stable security definer set search_path = '' as $$
  select * from private.browse_sale_rows(now())
$$;

create function public.browse_sale(sale_id uuid)
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean,
  items jsonb, event_code text, day_mode text, abundance text, photos jsonb
) language sql stable security definer set search_path = '' as $$
  select * from private.browse_sale_rows(now()) r where r.id = browse_sale.sale_id
$$;

-- Used only by the storage policy below: is this file a photo of a sale buyers can see right now?
create function public.sale_photo_listed(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sale_photos p join public.sales s on s.id = p.sale_id
    where p.storage_path = object_name
      and private.sale_listed(s.status, array(select sd.sale_date from public.sale_days sd where sd.sale_id = s.id), now()))
$$;

revoke all on function public.browse_sales(), public.browse_sale(uuid), public.sale_photo_listed(text) from public, anon, authenticated;
grant execute on function public.browse_sales(), public.browse_sale(uuid), public.sale_photo_listed(text) to anon, authenticated;
-- The 002 functions list finished sales forever; buyers use the browse functions instead.
revoke execute on function public.list_public_sales(), public.get_public_sale(uuid) from anon, authenticated;

create policy "buyers_read_listed_sale_photos" on storage.objects for select to anon, authenticated
  using (bucket_id = 'sale-photos' and public.sale_photo_listed(name));
commit;
