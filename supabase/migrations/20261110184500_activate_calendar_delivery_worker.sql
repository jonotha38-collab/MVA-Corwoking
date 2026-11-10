-- Activate ONLY the administrative Google Calendar outbox (not email).
-- The worker checks Google OAuth configuration before claiming any jobs.
begin;
update public.booking_delivery_config
  set enabled=true, calendar_enabled=true, email_enabled=false
  where id=1;

-- Future bookings from before activation will be delivered once the Google
-- owner authorizes the destination calendar. Past records are not backfilled.
insert into public.booking_delivery_jobs(source,reservation_id,action,channel)
select 'commercial', b.id,'created','calendar'
from public.bookings b
where b.status='confirmada'
  and (b.booking_date::text || 'T' || left(b.end_time::text,5)) >
    to_char(now() at time zone 'America/Maceio','YYYY-MM-DD"T"HH24:MI')
on conflict(source,reservation_id,action,channel) do nothing;

insert into public.booking_delivery_jobs(source,reservation_id,action,channel)
select 'intern',r.id,'created','calendar'
from public.intern_room_reservations r
where r.status='ativa'
  and r.reservation_date >= (now() at time zone 'America/Maceio')::date
on conflict(source,reservation_id,action,channel) do nothing;

-- Re-enable a single database-native worker; avoids requiring an
-- end-user to keep the browser open.
do $block$
declare worker_count integer;
begin
  select count(*) into worker_count from cron.job
   where jobname='mva-booking-calendar-worker';
  if worker_count=0 then
    perform cron.schedule(
      'mva-booking-calendar-worker','* * * * *',
      'select public.dispatch_mva_booking_deliveries();'
    );
  end if;
end;
$block$;
commit;