-- Aurea push reminders (reminders that arrive even when the app is closed).
-- Run this in the Supabase SQL Editor after schema.sql. Safe to run again.

-- 1. One row per device that turned on closed-app reminders.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  -- The device's time zone, used when the account's time zone setting is "Automatic".
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can read own push subscriptions" on public.push_subscriptions;
create policy "Users can read own push subscriptions"
on public.push_subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own push subscriptions" on public.push_subscriptions;
create policy "Users can insert own push subscriptions"
on public.push_subscriptions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions"
on public.push_subscriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
on public.push_subscriptions for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- 2. Reminders already sent, so each one goes out once. Only the server touches this
--    table (RLS on, no policies), and old rows are cleaned up automatically.
create table if not exists public.sent_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, reminder_key)
);

alter table public.sent_reminders enable row level security;

-- 3. A random shared secret, so only this database can trigger the reminder server.
--    Copy it into Vercel as CRON_SECRET:
--      select decrypted_secret from vault.decrypted_secrets where name = 'aurea_cron_secret';
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'aurea_cron_secret')
where not exists (select 1 from vault.secrets where name = 'aurea_cron_secret');

-- 4. Every minute, ask the Aurea server to send any reminders that are due.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('aurea-reminders')
where exists (select 1 from cron.job where jobname = 'aurea-reminders');

select cron.schedule(
  'aurea-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://my-aurea-planner.vercel.app/api/reminders/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'aurea_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
