-- SNAB treasure alerts: run the treasure-alerts Edge Function every 15 minutes. Apply after 006.
-- Needs pg_cron and pg_net, which Supabase provides; skipped where they don't exist (the local test database).
-- The function sends nothing until RESEND_API_KEY is set in Supabase → Edge Functions → Secrets.
do $outer$
begin
  if not exists (select from pg_available_extensions where name = 'pg_cron')
    or not exists (select from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron or pg_net not available; treasure alert schedule skipped';
    return;
  end if;
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  perform cron.schedule('treasure-alerts', '*/15 * * * *', $job$
    select net.http_post(url := 'https://mawfyehhbaifnuigqamw.supabase.co/functions/v1/treasure-alerts',
      headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 30000)
  $job$);
end $outer$;
