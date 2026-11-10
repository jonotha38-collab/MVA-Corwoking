-- Independent Google Calendar channel; email remains disabled by default.
-- Step 1 (safe): schema and enqueue logic. Activation and cron are separate
-- and are applied only after the updated worker is deployed.
begin;
alter table public.booking_delivery_config
  add column if not exists calendar_enabled boolean not null default false,
  add column if not exists email_enabled boolean not null default false;

create or replace function public.enqueue_mva_delivery()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare
  source_kind text;
  normal_state text;
  event_action text;
  cfg record;
begin
  select enabled,calendar_enabled,email_enabled into cfg
    from public.booking_delivery_config where id=1;
  if not coalesce(cfg.enabled,false)
     or (not coalesce(cfg.calendar_enabled,false) and not coalesce(cfg.email_enabled,false)) then
    return new;
  end if;
  source_kind := case when tg_table_name='bookings' then 'commercial' else 'intern' end;
  normal_state := case when source_kind='commercial' then 'confirmada' else 'ativa' end;
  if tg_op='INSERT' then
    if new.status<>normal_state then return new; end if;
    event_action:='created';
  elsif tg_op='UPDATE' then
    if old.status is distinct from 'cancelada' and new.status='cancelada' then
      event_action:='canceled';
    elsif old.status is distinct from normal_state and new.status=normal_state then
      event_action:='created';
    else return new; end if;
  else return new; end if;

  if cfg.calendar_enabled then
    insert into public.booking_delivery_jobs(source,reservation_id,action,channel)
      values(source_kind,new.id,event_action,'calendar')
    on conflict(source,reservation_id,action,channel) do nothing;
  end if;
  if cfg.email_enabled then
    insert into public.booking_delivery_jobs(source,reservation_id,action,channel)
      values(source_kind,new.id,event_action,'email')
    on conflict(source,reservation_id,action,channel) do nothing;
  end if;
  return new;
end;
$function$;
revoke all on function public.enqueue_mva_delivery() from public, anon, authenticated;

-- No historical or canceled jobs are replayed automatically.
commit;