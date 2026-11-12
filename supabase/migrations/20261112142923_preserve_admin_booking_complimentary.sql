alter table public.bookings
  add column if not exists admin_complimentary boolean not null default false;

create or replace function public.mva_apply_admin_booking_exemption()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.admin_complimentary := old.admin_complimentary;
    return new;
  end if;

  new.admin_complimentary := coalesce((
    select p.is_admin from public.profiles p where p.id = new.user_id
  ), false);

  if new.admin_complimentary then
    new.total_price := 0;
    new.fiscal_bonus_hours := 0;
    new.fiscal_bonus_cycle := null;
    new.fiscal_discount_percent := 0;
    new.fiscal_benefit_contract_id := null;
  end if;

  return new;
end;
$$;

revoke all on function public.mva_apply_admin_booking_exemption() from public, anon, authenticated;

-- Insert triggers run by name. Validate the slot and compute its base price
-- first; then apply the staff exemption before fiscal benefits and the deadline.
drop trigger if exists mva_admin_booking_exemption on public.bookings;
create trigger zz0_mva_admin_booking_exemption before insert or update on public.bookings
  for each row execute function public.mva_apply_admin_booking_exemption();

drop trigger zz_mva_apply_fiscal_room_benefit on public.bookings;
create trigger zz_mva_apply_fiscal_room_benefit before insert on public.bookings
  for each row when (not new.admin_complimentary)
  execute function public.zz_mva_apply_fiscal_room_benefit();

-- Correct active staff bookings that were exempt but saved at the base price.
-- Never rewrite a booking tied to a payment or a redemption.
update public.bookings b
set total_price = 0,
    payment_due_at = null,
    fiscal_bonus_hours = 0,
    fiscal_bonus_cycle = null,
    fiscal_discount_percent = 0,
    fiscal_benefit_contract_id = null
where b.admin_complimentary and b.status = 'confirmada'
  and b.booking_date + b.end_time > clock_timestamp() at time zone 'America/Maceio'
  and (b.total_price <> 0 or b.payment_due_at is not null or b.fiscal_benefit_contract_id is not null)
  and not exists (select 1 from public.mva_checkout_orders o where o.kind = 'booking' and o.resource_id = b.id)
  and not exists (select 1 from public.mva_booking_redemptions r where r.booking_id = b.id);

notify pgrst, 'reload schema';
