create schema mva_voucher_private;

revoke all on schema mva_voucher_private from public, anon, authenticated;
grant usage on schema mva_voucher_private to authenticated;

create table mva_voucher_private.booking_codes (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  code text not null unique check (code ~ '^[1-9][0-9]{5}$')
);
alter table mva_voucher_private.booking_codes enable row level security;
revoke all on mva_voucher_private.booking_codes from public, anon, authenticated;

-- The booking row is locked by both callers. Protect the payment evidence
-- during check-in as well, so a concurrent refund and check-in are ordered.
create function mva_voucher_private.coverage(p_booking public.bookings)
returns text language plpgsql set search_path = '' as $$
begin
  if p_booking.total_price = 0 and to_jsonb(p_booking)->>'admin_complimentary' = 'true' then
    return 'complimentary';
  end if;

  if p_booking.total_price = 0 and p_booking.duration_hours > 0
     and p_booking.fiscal_bonus_hours >= p_booking.duration_hours
     and coalesce(cardinality(p_booking.addons), 0) = 0 then
    return 'bonus';
  end if;

  perform 1 from public.mva_booking_redemptions r
  where r.booking_id = p_booking.id and r.user_id = p_booking.user_id
    and r.status = 'applied'
  limit 1 for share;
  if found then return 'credit'; end if;

  perform 1 from public.mva_checkout_orders o
  where o.kind = 'booking' and o.resource_id = p_booking.id
    and o.user_id = p_booking.user_id and o.status = 'paid' and o.livemode
  limit 1 for share;
  if found then return 'paid'; end if;

  return null;
end;
$$;

create function mva_voucher_private.issue(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings%rowtype;
  coverage text;
  voucher_code text;
  bytes bytea;
begin
  select b.* into booking from public.bookings b
  where b.id = p_booking_id and b.user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Reserva indisponível para esta conta.' using errcode = '42501';
  end if;

  if booking.status = 'cancelada' then return '{"status":"canceled"}'::jsonb; end if;
  if booking.check_in then return '{"status":"used"}'::jsonb; end if;
  if booking.status is distinct from 'confirmada' or
     booking.booking_date + booking.end_time <= clock_timestamp() at time zone 'America/Maceio' then
    return '{"status":"expired"}'::jsonb;
  end if;

  coverage := mva_voucher_private.coverage(booking);
  if coverage is null then return '{"status":"pending"}'::jsonb; end if;

  select c.code into voucher_code from mva_voucher_private.booking_codes c
  where c.booking_id = booking.id;
  if voucher_code is null then
    for attempt in 1..20 loop
      bytes := extensions.gen_random_bytes(4);
      insert into mva_voucher_private.booking_codes (booking_id, code)
      values (booking.id, (100000 + (
        (get_byte(bytes, 0)::bigint << 24) + (get_byte(bytes, 1) << 16)
        + (get_byte(bytes, 2) << 8) + get_byte(bytes, 3)
      ) % 900000)::text)
      on conflict (code) do nothing
      returning code into voucher_code;
      exit when found;
    end loop;
    if voucher_code is null then
      raise exception 'Não foi possível gerar o código do voucher.' using errcode = '54000';
    end if;
  end if;

  return jsonb_build_object('status', 'available', 'code', voucher_code, 'coverage', coverage);
end;
$$;

create function mva_voucher_private.check_in(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  normalized text;
  booking_id uuid;
  booking public.bookings%rowtype;
  local_now timestamp;
  result_status text;
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Apenas administradores podem validar vouchers.' using errcode = '42501';
  end if;

  if p_code is null or length(p_code) > 64 then return '{"status":"invalid"}'::jsonb; end if;
  normalized := regexp_replace(btrim(p_code), '[[:space:]-]', '', 'g');
  if normalized ~ '^[0-9]{6}$' then
    select c.booking_id into booking_id from mva_voucher_private.booking_codes c
    where c.code = normalized;
  elsif btrim(p_code) ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then
    -- Vouchers already issued with the reservation UUID are still valid.
    booking_id := btrim(p_code)::uuid;
  end if;

  select b.* into booking from public.bookings b where b.id = booking_id for update;
  if not found then return '{"status":"invalid"}'::jsonb; end if;

  local_now := clock_timestamp() at time zone 'America/Maceio';
  if booking.status = 'cancelada' then
    result_status := 'canceled';
  elsif booking.check_in then
    result_status := 'used';
  elsif booking.status is distinct from 'confirmada' or booking.booking_date + booking.end_time <= local_now then
    result_status := 'expired';
  elsif booking.booking_date > local_now::date then
    result_status := 'early';
  elsif mva_voucher_private.coverage(booking) is null then
    result_status := 'pending';
  else
    update public.bookings set check_in = true where id = booking.id;
    result_status := 'checked_in';
  end if;

  return jsonb_build_object(
    'status', result_status,
    'room', booking.space_name,
    'responsible', booking.responsible_name,
    'date', booking.booking_date,
    'startTime', left(booking.start_time::text, 5),
    'endTime', left(booking.end_time::text, 5)
  );
end;
$$;

create function public.mva_booking_voucher(p_booking_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select mva_voucher_private.issue(p_booking_id);
$$;

create function public.mva_check_in_voucher(p_code text)
returns jsonb language sql security invoker set search_path = '' as $$
  select mva_voucher_private.check_in(p_code);
$$;

revoke all on function mva_voucher_private.coverage(public.bookings) from public, anon, authenticated;
revoke all on function mva_voucher_private.issue(uuid), mva_voucher_private.check_in(text),
  public.mva_booking_voucher(uuid), public.mva_check_in_voucher(text) from public, anon, authenticated;
grant execute on function mva_voucher_private.issue(uuid), mva_voucher_private.check_in(text),
  public.mva_booking_voucher(uuid), public.mva_check_in_voucher(text) to authenticated;

notify pgrst, 'reload schema';
