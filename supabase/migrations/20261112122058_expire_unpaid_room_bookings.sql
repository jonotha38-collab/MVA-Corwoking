alter table public.bookings
  add column payment_due_at timestamptz,
  add column payment_expired_at timestamptz;

create index bookings_pending_deadline_idx on public.bookings (payment_due_at, id)
  where status = 'confirmada' and payment_due_at is not null and not check_in;

alter table public.mva_checkout_orders add column booking_expiry_checked_at timestamptz;

create function public.mva_set_booking_payment_deadline()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.payment_expired_at := null;
  if to_jsonb(new)->>'admin_complimentary' = 'true'
     or (new.total_price = 0 and new.duration_hours > 0
         and new.fiscal_bonus_hours >= new.duration_hours and coalesce(cardinality(new.addons), 0) = 0) then
    new.payment_due_at := null;
  else
    new.payment_due_at := least(
      clock_timestamp() + interval '1 hour',
      (new.booking_date + new.start_time) at time zone 'America/Maceio'
    );
  end if;
  return new;
end;
$$;

-- The deadline must be set after authoritative prices and benefits.
create trigger zzzz_mva_set_booking_payment_deadline before insert on public.bookings
  for each row execute function public.mva_set_booking_payment_deadline();

create function public.mva_enforce_booking_credit_deadline()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'applied' and exists (
    select 1 from public.bookings b
    where b.id = new.booking_id and b.payment_due_at <= clock_timestamp()
  ) then
    raise exception 'O prazo da reserva terminou. Faça um novo agendamento.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger mva_enforce_booking_credit_deadline before insert on public.mva_booking_redemptions
  for each row execute function public.mva_enforce_booking_credit_deadline();

-- A worker and a checkout claim lock the booking before locking the order.
-- The fiscal checkout keeps its existing claim rules.
create or replace function public.mva_claim_checkout_order(p_order uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  order_kind text;
  booking_id uuid;
  booking_user uuid;
  booking public.bookings%rowtype;
  n integer;
begin
  select o.kind, o.resource_id, o.user_id into order_kind, booking_id, booking_user
  from public.mva_checkout_orders o where o.id = p_order;

  if order_kind = 'booking' then
    select b.* into booking from public.bookings b
    where b.id = booking_id and b.user_id = booking_user for update;
    if not found or booking.status <> 'confirmada'
       or booking.payment_due_at <= clock_timestamp()
       or exists (select 1 from public.mva_booking_redemptions r
         where r.booking_id = booking.id and r.status = 'applied') then
      return false;
    end if;
  end if;

  update public.mva_checkout_orders
  set checkout_lock_until = now() + interval '90 seconds', updated_at = now()
  where id = p_order and status in ('pending', 'expired', 'failed')
    and (checkout_lock_until is null or checkout_lock_until < now())
    and (stripe_checkout_session_id is null or
         (session_expires_at is not null and session_expires_at < now()));
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create schema mva_booking_expiry_private;
revoke all on schema mva_booking_expiry_private from public, anon, authenticated;

create table mva_booking_expiry_private.config (
  id boolean primary key check (id),
  worker_key text not null
);
alter table mva_booking_expiry_private.config enable row level security;
revoke all on mva_booking_expiry_private.config from public, anon, authenticated;
insert into mva_booking_expiry_private.config values (true, encode(extensions.gen_random_bytes(32), 'hex'));

create function mva_booking_expiry_private.due()
returns table (
  booking_id uuid, order_id uuid, stripe_checkout_session_id text,
  stripe_account_id text, livemode boolean, order_status text
) language sql stable set search_path = '' as $$
  select b.id, o.id, o.stripe_checkout_session_id, o.stripe_account_id, o.livemode, o.status
  from public.bookings b
  left join public.mva_checkout_orders o on o.kind = 'booking' and o.resource_id = b.id
  where b.status = 'confirmada' and not b.check_in
    and b.payment_due_at <= now()
    and coalesce(o.status, '') <> 'paid'
    and coalesce(o.checkout_lock_until, '-infinity'::timestamptz) <= now()
    and coalesce(o.booking_expiry_checked_at, '-infinity'::timestamptz) < now() - interval '90 seconds'
    and not exists (select 1 from public.mva_booking_redemptions r
      where r.booking_id = b.id and r.status = 'applied')
  order by o.booking_expiry_checked_at nulls first, b.payment_due_at, b.id
  limit 24;
$$;

create function public.mva_booking_expiry_candidates(p_worker_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  candidates jsonb;
begin
  if p_worker_key is null or not exists (
    select 1 from mva_booking_expiry_private.config c where c.id and c.worker_key = p_worker_key
  ) then
    raise exception 'Worker não autorizado.' using errcode = '42501';
  end if;

  with due as materialized (select * from mva_booking_expiry_private.due()),
  touched as (
    update public.mva_checkout_orders o set booking_expiry_checked_at = now()
    from due where o.id = due.order_id returning o.id
  )
  select coalesce(jsonb_agg(to_jsonb(due)), '[]'::jsonb) into candidates from due;
  return candidates;
end;
$$;

create function public.mva_cancel_expired_booking(p_booking_id uuid, p_closed_session_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  booking public.bookings%rowtype;
  checkout public.mva_checkout_orders%rowtype;
begin
  select b.* into booking from public.bookings b where b.id = p_booking_id for update;
  if not found or booking.status <> 'confirmada' or booking.check_in
     or booking.payment_due_at is null or booking.payment_due_at > clock_timestamp() then
    return false;
  end if;

  select o.* into checkout from public.mva_checkout_orders o
  where o.kind = 'booking' and o.resource_id = booking.id for update;

  if checkout.status = 'paid' or checkout.checkout_lock_until > clock_timestamp()
     or checkout.stripe_checkout_session_id is distinct from p_closed_session_id
     or exists (select 1 from public.mva_booking_redemptions r
       where r.booking_id = booking.id and r.status = 'applied') then
    return false;
  end if;

  if checkout.status = 'pending' then
    update public.mva_checkout_orders
    set status = 'expired', stripe_checkout_url = null, updated_at = now()
    where id = checkout.id;
  end if;

  update public.bookings set status = 'cancelada', payment_expired_at = clock_timestamp()
  where id = booking.id;
  return true;
end;
$$;

create function mva_booking_expiry_private.dispatch()
returns void language plpgsql security definer set search_path = '' as $$
declare
  secret text;
begin
  if not exists (select 1 from mva_booking_expiry_private.due()) then return; end if;
  select c.worker_key into strict secret from mva_booking_expiry_private.config c where c.id;
  perform net.http_post(
    url := 'https://yealdaokedpfpdgvslzj.supabase.co/functions/v1/mva-stripe-gateway',
    body := '{"action":"expire_unpaid_bookings"}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mva-expiry-key', secret),
    timeout_milliseconds := 45000
  );
end;
$$;

revoke all on function public.mva_set_booking_payment_deadline(), public.mva_enforce_booking_credit_deadline(),
  mva_booking_expiry_private.due(), mva_booking_expiry_private.dispatch(),
  public.mva_claim_checkout_order(uuid), public.mva_booking_expiry_candidates(text),
  public.mva_cancel_expired_booking(uuid, text) from public, anon, authenticated;
grant execute on function public.mva_claim_checkout_order(uuid), public.mva_booking_expiry_candidates(text),
  public.mva_cancel_expired_booking(uuid, text) to service_role;

select cron.schedule('mva-expire-unpaid-bookings', '* * * * *', 'select mva_booking_expiry_private.dispatch();');
notify pgrst, 'reload schema';
