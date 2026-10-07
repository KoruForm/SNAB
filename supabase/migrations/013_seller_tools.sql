-- SNAB seller tools. Apply after 001-012.
--   * sales.details: what kind of sale it is, how buyers can pay, early birds, a short note, a rain-date
--     move and free leftovers. One small JSON object, shown to buyers through the browse functions.
--   * partners: real estate agents, movers and local businesses who hand SNAB to their customers. Josh adds
--     them in the Supabase Table editor; a sale started from a partner's link carries its code.
--   * treasure_demand(): what buyers are hunting for, counted across everyone's treasure lists. Only
--     treasures on 2 or more lists are shown, so nobody's own list can be read back.
--   * my_sale_treasure_lists(): how many treasure lists a seller's sale matches. Owner only.
begin;

create table public.partners (
  code text primary key check (code ~ '^[a-z0-9-]{2,30}$'),
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'business' check (kind in ('agent', 'mover', 'business', 'community')),
  blurb text not null default '' check (char_length(blurb) <= 200),
  website text not null default '' check (website = '' or website ~ '^https://' and char_length(website) <= 200),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.partners enable row level security;
revoke all on public.partners from public, anon, authenticated;

alter table public.sales
  add column details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 4000),
  add column partner_code text references public.partners(code) on update cascade on delete set null;
create index sales_partner on public.sales(partner_code);

-- A sale can only be linked to a partner that is still active when it's set.
create function private.guard_sale_partner() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.partner_code is not null and (tg_op = 'INSERT' or new.partner_code is distinct from old.partner_code)
    and not exists (select 1 from public.partners p where p.code = new.partner_code and p.active) then
    new.partner_code := null;
  end if;
  return new;
end $$;
create trigger sales_guard_partner before insert or update of partner_code on public.sales
  for each row execute function private.guard_sale_partner();

-- The browse rows gain the details and the partner's public name. The return type changes, so the
-- functions are dropped and made again (other functions call them by name only, so nothing else moves).
drop function public.browse_sales();
drop function public.browse_sale(uuid);
drop function private.browse_sale_rows(timestamptz);

create function private.browse_sale_rows(at_time timestamptz)
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean,
  items jsonb, event_code text, day_mode text, abundance text, photos jsonb, details jsonb, partner jsonb
) language sql stable set search_path = '' as $$
  select r.id, r.title, r.description, r.status, r.categories, r.highlights, r.days,
    r.town, r.address, r.latitude, r.longitude, r.exact_location,
    s.items, s.event_code, s.day_mode, s.abundance,
    coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'path', p.storage_path, 'name', p.file_name, 'type', p.content_type) order by p.sort_order, p.created_at)
      from public.sale_photos p where p.sale_id = r.id), '[]'::jsonb),
    s.details,
    (select jsonb_build_object('code', pt.code, 'name', pt.name, 'website', pt.website) from public.partners pt where pt.code = s.partner_code)
  from private.public_sale_rows(at_time) r
  join public.sales s on s.id = r.id
  where not s.hidden
    and private.sale_listed(r.status, array(select (d->>'date')::date from jsonb_array_elements(r.days) d), at_time)
$$;
revoke all on function private.browse_sale_rows(timestamptz) from public, anon, authenticated;

create function public.browse_sales()
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean,
  items jsonb, event_code text, day_mode text, abundance text, photos jsonb, details jsonb, partner jsonb
) language sql stable security definer set search_path = '' as $$
  select * from private.browse_sale_rows(now())
$$;
create function public.browse_sale(sale_id uuid)
returns table (
  id uuid, title text, description text, status text, categories text[], highlights text[], days jsonb,
  town text, address text, latitude double precision, longitude double precision, exact_location boolean,
  items jsonb, event_code text, day_mode text, abundance text, photos jsonb, details jsonb, partner jsonb
) language sql stable security definer set search_path = '' as $$
  select * from private.browse_sale_rows(now()) r where r.id = browse_sale.sale_id
$$;
revoke all on function public.browse_sales(), public.browse_sale(uuid) from public, anon, authenticated;
grant execute on function public.browse_sales(), public.browse_sale(uuid) to anon, authenticated;

-- A partner's landing page: name and blurb of an active partner, or nothing.
create function public.partner_info(partner text)
returns table (code text, name text, kind text, blurb text, website text) language sql stable security definer set search_path = '' as $$
  select p.code, p.name, p.kind, p.blurb, p.website from public.partners p where p.code = lower(partner_info.partner) and p.active
$$;
revoke all on function public.partner_info(text) from public, anon, authenticated;
grant execute on function public.partner_info(text) to anon, authenticated;

-- Josh's partner report in the dashboard: how many sales each partner brought in. Not reachable through the API.
create view public.partner_sales with (security_invoker = true) as
  select p.code, p.name, p.kind, p.active,
    count(s.id) as sales_started,
    count(s.id) filter (where s.published_at is not null) as sales_published
  from public.partners p left join public.sales s on s.partner_code = p.code
  group by p.code, p.name, p.kind, p.active;
revoke all on public.partner_sales from public, anon, authenticated;

-- Treasure matching, close to lib/treasure-match.ts (without its few synonyms): every main word of the treasure
-- has to be found in the same highlight. Describing words like "old" only count when there's nothing else.
create function private.treasure_hits(treasure text, corpus text[]) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  stop text[] := array['and','or','the','a','an','for','stuff','things','looking','some','near','me','of','with','i','my','to','love','like','find','want','sale','please'];
  describers text[] := array['old','vintage','retro','antique','used','small','big','large','little','nice','good','cheap','new'];
  words text[]; strong text[]; needed text[];
begin
  words := array(select w from unnest(regexp_split_to_array(lower(coalesce(treasure, '')), '[^a-z0-9]+')) w where w <> '' and not (w = any(stop)));
  strong := array(select w from unnest(words) w where not (w = any(describers)));
  needed := case when cardinality(strong) > 0 then strong else words end;
  if cardinality(needed) = 0 then return false; end if;
  return exists (select 1 from unnest(corpus) c where (
    select bool_and(lower(c) ~ ('\m' || w || '(s|es|ing)?\M')) from unnest(needed) w));
end $$;

-- What a sale offers, one line per available highlight (label, category and description).
create function private.sale_corpus(sale_items jsonb, sale_highlights text[]) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(line), '{}') from (
    select concat_ws(' ', i->>'label', i->>'category', i->>'description') as line
      from jsonb_array_elements(coalesce(sale_items, '[]'::jsonb)) i where coalesce((i->>'available')::boolean, true)
    union all
    select h from unnest(sale_highlights) h where jsonb_array_length(coalesce(sale_items, '[]'::jsonb)) = 0
  ) lines
$$;
revoke all on all functions in schema private from public, anon, authenticated;

create function public.treasure_demand()
returns table (treasure text, lists bigint) language sql stable security definer set search_path = '' as $$
  select t, count(distinct l.user_id) from public.treasure_lists l, unnest(l.treasures) raw,
    lateral (select lower(regexp_replace(trim(raw), '\s+', ' ', 'g')) as t) n
  where t <> ''
  group by t having count(distinct l.user_id) >= 2
  order by 2 desc, 1 limit 30
$$;

create function public.my_sale_treasure_lists(target_sale uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.treasure_lists l
  where exists (select 1 from public.sales s where s.id = target_sale and s.owner_id = (select auth.uid()))
    and l.user_id is distinct from (select auth.uid())
    and exists (select 1 from public.sales s, unnest(l.treasures) t
      where s.id = target_sale and private.treasure_hits(t, private.sale_corpus(s.items, s.highlights)))
$$;

revoke all on function public.treasure_demand(), public.my_sale_treasure_lists(uuid) from public, anon, authenticated;
grant execute on function public.treasure_demand() to anon, authenticated;
grant execute on function public.my_sale_treasure_lists(uuid) to authenticated;
commit;
