-- Aurea sync guard: refuse saves from outdated copies of the app.
--
-- Copies of Aurea from before safe sync (for example a browser tab left open for days)
-- save the whole planner over the cloud copy and can erase changes made on other devices.
-- Current versions mark every save with "syncProtocol": 2. This rejects updates without
-- that mark; the old tab shows a sync error instead, and reloading it fixes it.
--
-- Run in the Supabase SQL Editor AFTER the app version that sends syncProtocol is live.
-- Safe to run again.

create or replace function public.app_state_require_protocol()
returns trigger
language plpgsql
as $$
begin
  if coalesce((new.data->>'syncProtocol')::int, 0) < 2 then
    raise exception 'This copy of Aurea is out of date. Reload the page to keep syncing.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists app_state_require_protocol on public.app_state;
create trigger app_state_require_protocol
before update on public.app_state
for each row execute function public.app_state_require_protocol();
