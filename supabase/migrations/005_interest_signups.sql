-- SNAB "coming soon" interest list. Apply after 001-004.
-- Anyone can add their email through public.register_interest(); nobody can read the list through the API.
-- Josh reads it in the Supabase dashboard (Table editor → interest_signups).
begin;

create table public.interest_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  interest text not null default 'both' check (interest in ('buying', 'selling', 'both')),
  suburb text not null default '' check (char_length(suburb) <= 100),
  created_at timestamptz not null default now()
);
create unique index interest_signups_email_key on public.interest_signups (lower(email));
alter table public.interest_signups enable row level security;
revoke all on public.interest_signups from public, anon, authenticated;

-- Signing up twice keeps the first entry and still reports success, so the form never reveals who is on the list.
create function public.register_interest(signup_email text, signup_interest text default 'both', signup_suburb text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.interest_signups (email, interest, suburb)
  values (lower(trim(signup_email)), coalesce(nullif(signup_interest, ''), 'both'), trim(coalesce(signup_suburb, '')))
  on conflict (lower(email)) do nothing;
end $$;
revoke all on function public.register_interest(text, text, text) from public;
grant execute on function public.register_interest(text, text, text) to anon, authenticated;

commit;
