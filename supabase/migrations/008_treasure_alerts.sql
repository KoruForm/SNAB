-- SNAB treasure list on the buyer's account, and email alerts when a new sale has something on it. Apply after 001-007.
-- A signed-in buyer's list lives in treasure_lists (owner-only). The treasure-alerts Edge Function reads
-- watchers and listed sales through treasure_alert_work(), matches them, emails each buyer and records what
-- it sent, so nobody hears about the same sale twice. Both of those functions are for the service role only.
begin;

-- When a sale first went public. Set by the server, never by the app.
alter table public.sales add column published_at timestamptz;
update public.sales set published_at = updated_at where status in ('published', 'closed');
create function private.stamp_published_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.published_at := case when tg_op = 'UPDATE' and old.published_at is not null then old.published_at
    when new.status in ('published', 'closed') then now() end;
  return new;
end $$;
create trigger sales_published_at before insert or update on public.sales
  for each row execute function private.stamp_published_at();

create table public.treasure_lists (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  treasures text[] not null default '{}' check (cardinality(treasures) <= 30),
  alerts boolean not null default false,
  -- Alerts cover sales that go up after this moment, so switching on never sends a backlog.
  alerts_from timestamptz,
  -- Lets the "stop these emails" link work without signing in.
  stop_token uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
create function private.guard_treasure_list() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from unnest(new.treasures) t where t is null or char_length(t) not between 1 and 80) then
    raise exception 'Each treasure needs 1 to 80 characters' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then new.stop_token := old.stop_token; else new.stop_token := gen_random_uuid(); end if;
  new.alerts_from := case when not new.alerts then null
    when tg_op = 'UPDATE' and old.alerts then old.alerts_from else now() end;
  new.updated_at := now();
  return new;
end $$;
create trigger treasure_lists_guard before insert or update on public.treasure_lists
  for each row execute function private.guard_treasure_list();
alter table public.treasure_lists enable row level security;
create policy "owners_manage_treasure_list" on public.treasure_lists for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.treasure_lists from public, anon, authenticated;
grant select, insert, update, delete on public.treasure_lists to authenticated;

create table public.treasure_alert_sends (
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, sale_id)
);
create index treasure_alert_sends_sale on public.treasure_alert_sends(sale_id);
alter table public.treasure_alert_sends enable row level security;
revoke all on public.treasure_alert_sends from public, anon, authenticated;

revoke all on all functions in schema private from public, anon, authenticated;

-- Everything the alert run needs: buyers with alerts on, and published sales still listed, each with
-- the buyers already told about it. Only public sale details go out (no street address).
create function public.treasure_alert_work()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'watchers', coalesce((select jsonb_agg(jsonb_build_object('user_id', l.user_id, 'email', u.email, 'treasures', l.treasures,
        'alerts_from', l.alerts_from, 'stop_token', l.stop_token))
      from public.treasure_lists l join auth.users u on u.id = l.user_id
      where l.alerts and cardinality(l.treasures) > 0 and u.email is not null), '[]'::jsonb),
    'sales', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'town', r.town, 'days', r.days,
        'categories', r.categories, 'highlights', r.highlights, 'items', r.items, 'owner_id', s.owner_id, 'published_at', s.published_at,
        'told', coalesce((select jsonb_agg(t.user_id) from public.treasure_alert_sends t where t.sale_id = r.id), '[]'::jsonb)))
      from private.browse_sale_rows(now()) r join public.sales s on s.id = r.id
      where r.status = 'published' and s.published_at is not null), '[]'::jsonb))
$$;

create function public.record_treasure_alerts(alert_user uuid, alert_sales uuid[])
returns void language sql security definer set search_path = '' as $$
  insert into public.treasure_alert_sends (user_id, sale_id) select alert_user, unnest(alert_sales) on conflict do nothing
$$;

-- The "stop these emails" link. Reports nothing about whether the token matched anyone.
create function public.stop_treasure_alerts(token uuid)
returns void language sql security definer set search_path = '' as $$
  update public.treasure_lists set alerts = false where stop_token = token
$$;

revoke all on function public.treasure_alert_work(), public.record_treasure_alerts(uuid, uuid[]), public.stop_treasure_alerts(uuid) from public, anon, authenticated;
grant execute on function public.treasure_alert_work(), public.record_treasure_alerts(uuid, uuid[]) to service_role;
grant execute on function public.stop_treasure_alerts(uuid) to anon, authenticated;
commit;
