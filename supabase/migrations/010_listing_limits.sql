-- SNAB listing limits. Apply after 001-009.
-- Every buyer's phone downloads every listed sale, so one oversized or never-ending listing slows the map for
-- everyone. The app already keeps sellers inside these limits; this makes the database hold them too, so a
-- listing sent straight to the API can't get round them.
--   * up to 20 categories, 30 highlights (80 characters each) and 40 items (50 KB in all) per sale
--   * up to 7 sale days, each within six months (183 days) of today in Auckland when it is saved
--   * up to 50 sales per account
begin;

alter table public.sales
  add constraint sales_categories_limit check (cardinality(categories) <= 20),
  add constraint sales_highlights_limit check (cardinality(highlights) <= 30),
  add constraint sales_items_limit check (jsonb_array_length(items) <= 40 and octet_length(items::text) <= 50000);

create function private.guard_sale_highlights() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from unnest(new.highlights) h where char_length(h) > 80) then
    raise exception 'Keep each highlight to 80 characters' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger sales_guard_highlights before insert or update of highlights on public.sales
  for each row execute function private.guard_sale_highlights();

create function private.guard_sale_days() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sale_date > (now() at time zone 'Pacific/Auckland')::date + 183 then
    raise exception 'Choose a sale date in the next six months' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger sale_days_guard before insert or update on public.sale_days
  for each row execute function private.guard_sale_days();

-- Runs after the whole statement, so replace_sale_days() is checked on the full set of days it saved.
create function private.limit_sale_days() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.sale_days where sale_id = new.sale_id) > 7 then
    raise exception 'Keep a sale to 7 days or fewer' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger sale_days_limit after insert or update on public.sale_days
  for each row execute function private.limit_sale_days();

create function private.limit_sales_per_owner() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.sales where owner_id = new.owner_id) > 50 then
    raise exception 'This account already has 50 sales. Delete an old one to start another' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger sales_owner_limit after insert on public.sales
  for each row execute function private.limit_sales_per_owner();

revoke all on all functions in schema private from public, anon, authenticated;
commit;
