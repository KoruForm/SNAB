-- SNAB listing reports and moderation. Apply after 001-005.
-- Buyers report a sale through public.report_sale(); nobody can read reports through the API.
-- Josh reviews them in the Supabase dashboard: Table editor → reports_to_review (newest first), and
-- hides or restores a sale by ticking sales.hidden. A hidden sale and its photos drop out of browsing.
-- When three different signed-in people report the same sale, it hides itself until Josh looks at it.
-- Restoring a sale (unticking hidden) marks its open reports as dismissed, so the count starts again.
begin;

alter table public.sales
  add column hidden boolean not null default false,
  add column hidden_at timestamptz;

-- Sellers manage their own sales row, but only the dashboard or the report count may change hidden.
create function private.guard_sale_hidden() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.hidden := false; new.hidden_at := null;
    else new.hidden := old.hidden; new.hidden_at := old.hidden_at; end if;
  elsif new.hidden and (tg_op = 'INSERT' or not old.hidden) then new.hidden_at := now();
  elsif not new.hidden then new.hidden_at := null;
  end if;
  return new;
end $$;
create trigger sales_guard_hidden before insert or update on public.sales
  for each row execute function private.guard_sale_hidden();

create table public.sale_reports (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  -- Signed-in reporter; null for someone not signed in, who is told apart by a random key their browser keeps.
  reporter_id uuid references auth.users (id) on delete set null,
  device_key text check (char_length(device_key) <= 64),
  reason text not null check (reason in ('wrong-details', 'not-running', 'unsafe', 'offensive', 'other')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);
create index sale_reports_sale_idx on public.sale_reports (sale_id, status);
-- One report per sale from each account, and from each browser when not signed in.
create unique index sale_reports_one_per_account on public.sale_reports (sale_id, reporter_id) where reporter_id is not null;
create unique index sale_reports_one_per_device on public.sale_reports (sale_id, device_key) where reporter_id is null and device_key is not null;
alter table public.sale_reports enable row level security;
revoke all on public.sale_reports from public, anon, authenticated;

create function private.dismiss_reports_on_restore() returns trigger language plpgsql set search_path = '' as $$
begin
  update public.sale_reports set status = 'dismissed' where sale_id = new.id and status = 'open';
  return null;
end $$;
create trigger sales_dismiss_reports_on_restore after update of hidden on public.sales
  for each row when (old.hidden and not new.hidden) execute function private.dismiss_reports_on_restore();

revoke all on all functions in schema private from public, anon, authenticated;

-- Reporting only works on a sale buyers can currently see. Repeat reports quietly keep the first one.
create function public.report_sale(report_sale_id uuid, report_reason text, report_note text default '', report_device_key text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare reporter uuid := auth.uid();
begin
  if not exists (select 1 from private.browse_sale_rows(now()) r where r.id = report_sale_id) then return; end if;
  insert into public.sale_reports (sale_id, reporter_id, device_key, reason, note)
  values (report_sale_id, reporter, case when reporter is null then nullif(left(trim(coalesce(report_device_key, '')), 64), '') end,
    report_reason, left(trim(coalesce(report_note, '')), 500))
  on conflict do nothing;
  if (select count(distinct reporter_id) from public.sale_reports where sale_id = report_sale_id and status = 'open' and reporter_id is not null) >= 3 then
    update public.sales set hidden = true where id = report_sale_id and not hidden;
  end if;
end $$;
revoke all on function public.report_sale(uuid, text, text, text) from public;
grant execute on function public.report_sale(uuid, text, text, text) to anon, authenticated;

-- Buyers never see a hidden sale or its photos (004's functions, with "not hidden" added).
create or replace function private.browse_sale_rows(at_time timestamptz)
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
  where not s.hidden
    and private.sale_listed(r.status, array(select (d->>'date')::date from jsonb_array_elements(r.days) d), at_time)
$$;
revoke all on function private.browse_sale_rows(timestamptz) from public, anon, authenticated;

create or replace function public.sale_photo_listed(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sale_photos p join public.sales s on s.id = p.sale_id
    where p.storage_path = object_name and not s.hidden
      and private.sale_listed(s.status, array(select sd.sale_date from public.sale_days sd where sd.sale_id = s.id), now()))
$$;

-- Josh's review list in the dashboard. Not reachable through the API.
create view public.reports_to_review with (security_invoker = true) as
  select r.created_at as reported_at, s.title as sale_title, s.hidden as sale_hidden,
    case r.reason when 'wrong-details' then 'Wrong details' when 'not-running' then 'Sale isn''t running'
      when 'unsafe' then 'Unsafe or scam' when 'offensive' then 'Offensive photos or text' else 'Something else' end as reason,
    r.note, r.status, r.reporter_id is not null as signed_in,
    (select count(*) from public.sale_reports o where o.sale_id = r.sale_id and o.status = 'open') as open_reports_for_sale,
    r.sale_id, r.id as report_id
  from public.sale_reports r join public.sales s on s.id = r.sale_id
  order by r.created_at desc;
revoke all on public.reports_to_review from public, anon, authenticated;

commit;
