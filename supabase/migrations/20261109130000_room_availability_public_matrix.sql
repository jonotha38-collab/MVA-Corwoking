-- Public, privacy-safe room availability for the MVA booking picker.
-- Returns time-slot status only; no customer IDs, names, contacts or booking identifiers.
create or replace function public.mva_room_availability(
  p_space_id uuid, p_from date, p_days integer default 7
)
returns table(booking_date date, start_time time, end_time time, available boolean, reason text)
language plpgsql security definer set search_path = ''
as $$
declare
 room public.spaces%rowtype;
 range_parts text[];
 opens_at time;
 closes_at time;
 d date;
 slot_start time;
 slot_end time;
 local_now timestamp;
 reserved boolean;
begin
 if p_space_id is null or p_from is null or p_days not between 1 and 7 then
  raise exception 'Intervalo de consulta inválido.' using errcode='22023';
 end if;
 local_now := now() at time zone 'America/Maceio';
 if p_from < local_now::date or p_from > local_now::date+60 then
  raise exception 'Selecione uma data nos próximos 60 dias.' using errcode='22023';
 end if;
 select * into room from public.spaces s
 where s.id=p_space_id and s.approval='aprovado' and s.status='available';
 if not found then
  raise exception 'Sala indisponível para reservas.' using errcode='22023';
 end if;
 range_parts := regexp_match(coalesce(room.opening_hours,''),'([0-2][0-9]:[0-5][0-9])[^0-9]+([0-2][0-9]:[0-5][0-9])');
 if range_parts is null then
  -- Do not invent opening hours when the owner did not configure them.
  return;
 end if;
 opens_at := range_parts[1]::time;
 closes_at := range_parts[2]::time;
 if opens_at >= closes_at then return; end if;
 for d in select g::date from pg_catalog.generate_series(p_from,least(p_from+p_days-1,local_now::date+60),interval '1 day') g loop
  slot_start:=opens_at;
  while slot_start+interval '1 hour'<=closes_at loop
   slot_end:=(slot_start+interval '1 hour')::time;
   select exists(
     select 1 from public.bookings b
     where b.space_id=p_space_id and b.booking_date=d and b.status='confirmada'
       and b.start_time<slot_end and b.end_time>slot_start
   ) into reserved;
   booking_date:=d;
   start_time:=slot_start;
   end_time:=slot_end;
   if (d+slot_start)<=local_now then
    available:=false;reason:='encerrado';
   elsif reserved then
    available:=false;reason:='ocupado';
   else
    available:=true;reason:='livre';
   end if;
   return next;
   slot_start:=slot_end;
  end loop;
 end loop;
end;
$$;
revoke all on function public.mva_room_availability(uuid,date,integer) from public,anon,authenticated;
-- Status-only availability is intended for public room listings and does not expose PII.
grant execute on function public.mva_room_availability(uuid,date,integer) to anon,authenticated;
comment on function public.mva_room_availability(uuid,date,integer) is
 'Privacy-safe hourly slot matrix for approved public room; no customer data returned.';
