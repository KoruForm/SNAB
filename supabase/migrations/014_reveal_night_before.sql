-- SNAB address reveal timing. Apply after 001-013.
-- "Reveal on sale day" now starts at 6pm the evening before, Auckland time, so buyers can plan their
-- route the night before. The rest of the rule is unchanged. Mirrored by addressVisible() in lib/drafts/types.ts.
-- 'now': from publication until the last sale day ends. 'sale-day': from 6pm the evening before, and on sale days.
-- 'area-only': never. A closed sale or a draft never reveals the street.
create or replace function private.address_visible(sale_status text, reveal text, sale_dates date[], at_time timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select coalesce(sale_status = 'published' and case reveal
    when 'now' then (at_time at time zone 'Pacific/Auckland')::date <= (select max(d) from unnest(sale_dates) d)
    when 'sale-day' then (at_time at time zone 'Pacific/Auckland')::date = any(sale_dates)
      or ((at_time at time zone 'Pacific/Auckland')::time >= time '18:00'
        and (at_time at time zone 'Pacific/Auckland')::date + 1 = any(sale_dates))
    else false
  end, false)
$$;
