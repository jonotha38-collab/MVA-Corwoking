-- Administrator-only complimentary bookings, decided by trusted profiles.
alter table public.bookings
  add column if not exists admin_complimentary boolean not null default false;

create or replace function public.mva_apply_admin_booking_exemption()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.admin_complimentary := coalesce((
      select p.is_admin from public.profiles p where p.id = new.user_id
    ), false);
    if new.admin_complimentary then new.total_price := 0; end if;
  elsif tg_op = 'UPDATE' then
    new.admin_complimentary := old.admin_complimentary;
    if old.admin_complimentary then new.total_price := 0; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists mva_admin_booking_exemption on public.bookings;
create trigger mva_admin_booking_exemption before insert or update on public.bookings
for each row execute function public.mva_apply_admin_booking_exemption();
