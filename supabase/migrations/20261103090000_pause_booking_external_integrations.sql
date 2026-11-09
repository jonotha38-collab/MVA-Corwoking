-- Suspensão reversível de integrações de Google Agenda e e-mail de reservas.
-- Agendamentos e avisos internos seguem intactos; trabalhos pendentes antigos não serão reenviados.
begin;

alter table public.booking_delivery_config
  add column if not exists enabled boolean not null default false;
update public.booking_delivery_config set enabled=false where id=1;
update public.booking_delivery_jobs
set status='skipped',
    locked_at=null,
    last_error='Integrações pausadas manualmente pela MVA; não reenviar reservas antigas.'
where status in ('pending','processing');

create or replace function public.enqueue_mva_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  source_kind text;
  old_state text;
  new_state text;
  event_action text;
begin
  if not coalesce((select enabled from public.booking_delivery_config where id=1),false) then
    return new;
  end if;
  source_kind := case when tg_table_name='bookings' then 'commercial' else 'intern' end;
  new_state := case when source_kind='commercial' then 'confirmada' else 'ativa' end;
  if tg_op='INSERT' then
    if new.status<>new_state then return new; end if;
    event_action:='created';
  elsif tg_op='UPDATE' then
    old_state:=old.status;
    if old_state='cancelada' or new.status<>'cancelada' then return new; end if;
    event_action:='canceled';
  else return new; end if;
  insert into public.booking_delivery_jobs(source,reservation_id,action,channel)
  values(source_kind,new.id,event_action,'calendar'),
        (source_kind,new.id,event_action,'email')
  on conflict(source,reservation_id,action,channel) do nothing;
  return new;
end;
$$;
revoke all on function public.enqueue_mva_delivery() from public,anon,authenticated;

create or replace function public.claim_mva_delivery_jobs(p_channels text[],p_limit integer default 12)
returns setof public.booking_delivery_jobs
language plpgsql security definer set search_path = '' as $$
begin
  if current_user <> 'service_role'
     and coalesce((nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'),'') <> 'service_role' then
    raise exception 'Acesso restrito ao serviço de entrega.' using errcode='42501';
  end if;
  if not coalesce((select enabled from public.booking_delivery_config where id=1),false) then
    return;
  end if;
  return query
    with candidates as (
      select j.id from public.booking_delivery_jobs j
      where j.channel=any(p_channels)
        and j.attempts<8
        and j.next_attempt_at<=now()
        and (j.status='pending'
             or (j.status='processing' and j.locked_at<now()-interval '8 minutes'))
      order by j.id
      for update skip locked
      limit least(greatest(p_limit,1),20)
    )
    update public.booking_delivery_jobs j
      set status='processing',locked_at=now(),attempts=j.attempts+1
    from candidates c where j.id=c.id
    returning j.*;
end;
$$;
revoke all on function public.claim_mva_delivery_jobs(text[],integer) from public,anon,authenticated;
grant execute on function public.claim_mva_delivery_jobs(text[],integer) to service_role;

create or replace function public.dispatch_mva_booking_deliveries()
returns void language plpgsql security definer set search_path = '' as $$
declare secret text;
begin
  if not coalesce((select enabled from public.booking_delivery_config where id=1),false) then
    return;
  end if;
  select webhook_secret into secret from public.booking_delivery_config where id=1;
  if secret is null then return; end if;
  perform net.http_post(
    url:='https://yealdaokedpfpdgvslzj.supabase.co/functions/v1/mva-booking-deliveries',
    body:='{}'::jsonb,
    headers:=jsonb_build_object('Content-Type','application/json','x-mva-delivery-key',secret),
    timeout_milliseconds:=5000
  );
end;
$$;
revoke all on function public.dispatch_mva_booking_deliveries() from public,anon,authenticated;

-- Remove the minute-by-minute worker; resuming requires an explicit decision.
do $$
declare job_id bigint;
begin
  for job_id in select jobid from cron.job where jobname='mva-booking-deliveries-worker'
  loop perform cron.unschedule(job_id); end loop;
end;
$$;

commit;