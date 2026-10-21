-- Aurea safe sync: version-checked saves and hourly backups.
-- Run this in the Supabase SQL Editor after schema.sql. Safe to run again.

-- 1. Every save bumps a version number. The app only saves when the version is the
--    one it last saw, so two devices can no longer silently overwrite each other;
--    instead the app merges the changes and saves again.
alter table public.app_state add column if not exists version bigint not null default 0;

create or replace function public.app_state_bump_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

drop trigger if exists app_state_bump_version on public.app_state;
create trigger app_state_bump_version
before update on public.app_state
for each row execute function public.app_state_bump_version();

-- 2. Hourly backups of each planner, kept for 30 days, so lost data can be restored.
--    Only the database itself writes here (RLS on, no policies).
create table if not exists public.app_state_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  version bigint not null,
  saved_at timestamptz not null default now()
);

create index if not exists app_state_history_user_saved_at on public.app_state_history (user_id, saved_at desc);
alter table public.app_state_history enable row level security;

create or replace function public.app_state_backup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.data is distinct from new.data and not exists (
    select 1 from public.app_state_history
    where user_id = old.user_id and saved_at > now() - interval '1 hour'
  ) then
    insert into public.app_state_history (user_id, data, version) values (old.user_id, old.data, old.version);
    delete from public.app_state_history where user_id = old.user_id and saved_at < now() - interval '30 days';
  end if;
  return new;
end;
$$;

drop trigger if exists app_state_backup on public.app_state;
create trigger app_state_backup
after update on public.app_state
for each row execute function public.app_state_backup();

-- To restore someone's planner from a backup (run as the project owner):
--   select id, saved_at, version from public.app_state_history where user_id = '<user id>' order by saved_at desc;
--   update public.app_state set data = (select data from public.app_state_history where id = <backup id>), updated_at = now()
--   where user_id = '<user id>';
