-- Every light/fan in the 3D house. Optionally linked to a relay channel.
create table if not exists smarthome.fixtures (
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null,                 -- e.g. 'living.fan'
  room       text not null,
  name       text not null,
  kind       text not null check (kind in ('light','fan','lamp','strip','exhaust')),
  on_state   boolean not null default false,
  device_id  text references smarthome.devices(id) on delete set null,
  n          int,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);
alter table smarthome.fixtures enable row level security;
drop policy if exists fixtures_owner on smarthome.fixtures;
create policy fixtures_owner on smarthome.fixtures
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on smarthome.fixtures to authenticated;

-- When a linked fixture is toggled, pass it to its relay channel.
create or replace function smarthome.fixture_to_channel() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.device_id is not null and new.n is not null
     and (tg_op = 'INSERT' or new.on_state is distinct from old.on_state) then
    update smarthome.channels set desired = new.on_state, updated_at = now()
    where device_id = new.device_id and n = new.n;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists fixture_to_channel on smarthome.fixtures;
create trigger fixture_to_channel before insert or update on smarthome.fixtures
  for each row execute function smarthome.fixture_to_channel();

do $$ begin
  alter publication supabase_realtime add table smarthome.fixtures;
exception when duplicate_object then null; end $$;
