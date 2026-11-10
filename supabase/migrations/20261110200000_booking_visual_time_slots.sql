-- Expose only occupied time ranges, not customer identities or booking details.
create or replace function public.mva_occupied_booking_slots(
  p_space_id uuid, p_booking_date date
)
returns table(start_time time without time zone, end_time time without time zone)
language sql stable security definer set search_path = ''
as $$
  select b.start_time, b.end_time
  from public.bookings b
  join public.spaces s on s.id = b.space_id
  where b.space_id = p_space_id
    and b.booking_date = p_booking_date
    and b.status = 'confirmada'
    and s.approval = 'aprovado'
    and s.status = 'available'
    and p_booking_date between (now() at time zone 'America/Maceio')::date
      and ((now() at time zone 'America/Maceio')::date + 90)
$$;
revoke all on function public.mva_occupied_booking_slots(uuid,date) from public;
grant execute on function public.mva_occupied_booking_slots(uuid,date) to authenticated, anon;
