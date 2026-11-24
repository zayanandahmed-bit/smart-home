-- Smart home: own schema in the shared project. Idempotent.
create schema if not exists smarthome;

create table if not exists smarthome.devices (
  id          text primary key,                       -- e.g. 'proto1', 'hall-board'
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_user uuid references auth.users(id) on delete set null, -- the ESP32's own login
  name        text not null default '',
  online      boolean not null default false,
  last_seen   timestamptz
);

create table if not exists smarthome.channels (
  device_id  text not null references smarthome.devices(id) on delete cascade,
  n          int  not null,
  name       text not null default '',
  desired    boolean not null default false,          -- what the app asked for
  reported   boolean,                                  -- what the relay really did
  schedules  jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (device_id, n)
);

alter table smarthome.devices  enable row level security;
alter table smarthome.channels enable row level security;

drop policy if exists devices_owner  on smarthome.devices;
drop policy if exists devices_device on smarthome.devices;
drop policy if exists channels_owner on smarthome.channels;
drop policy if exists channels_device on smarthome.channels;

create policy devices_owner on smarthome.devices
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy devices_device on smarthome.devices
  for select to authenticated using (device_user = auth.uid());

create policy channels_owner on smarthome.channels
  for all to authenticated
  using (exists (select 1 from smarthome.devices d where d.id = device_id and d.owner = auth.uid()))
  with check (exists (select 1 from smarthome.devices d where d.id = device_id and d.owner = auth.uid()));
create policy channels_device on smarthome.channels
  for select to authenticated
  using (exists (select 1 from smarthome.devices d where d.id = device_id and d.device_user = auth.uid()));

-- The ESP32 may only report state and heartbeat, nothing else.
create or replace function smarthome.device_report(p_device text, p_n int, p_reported boolean)
returns void language sql security definer set search_path = '' as $$
  update smarthome.channels c set reported = p_reported, updated_at = now()
  from smarthome.devices d
  where c.device_id = d.id and d.id = p_device and c.n = p_n and d.device_user = auth.uid();
$$;

create or replace function smarthome.device_heartbeat(p_device text)
returns void language sql security definer set search_path = '' as $$
  update smarthome.devices set online = true, last_seen = now()
  where id = p_device and device_user = auth.uid();
$$;

revoke all on function smarthome.device_report(text,int,boolean)  from public, anon;
revoke all on function smarthome.device_heartbeat(text)           from public, anon;
grant execute on function smarthome.device_report(text,int,boolean) to authenticated;
grant execute on function smarthome.device_heartbeat(text)          to authenticated;

grant usage on schema smarthome to authenticated;
grant select, insert, update, delete on smarthome.devices, smarthome.channels to authenticated;

-- live updates for the web app
do $$ begin
  alter publication supabase_realtime add table smarthome.channels;
exception when duplicate_object then null; end $$;
