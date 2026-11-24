-- A wall switch was flipped on the board itself. The board tells the database,
-- so the app shows the new state. Only the board's own login can do this.
create or replace function smarthome.device_toggle(p_device text, p_n int, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from smarthome.devices where id = p_device and device_user = auth.uid()) then
    raise exception 'not your device';
  end if;
  update smarthome.channels set desired = p_on, reported = p_on, updated_at = now()
  where device_id = p_device and n = p_n;
  update smarthome.fixtures set on_state = p_on
  where device_id = p_device and n = p_n and on_state is distinct from p_on;
end $$;
revoke all on function smarthome.device_toggle(text,int,boolean) from public, anon;
grant execute on function smarthome.device_toggle(text,int,boolean) to authenticated;
