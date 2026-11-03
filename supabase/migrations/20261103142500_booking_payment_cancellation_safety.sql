-- Protect paid bookings: a cancellation is not automatically a Stripe refund.
-- Cancel/refund the Stripe charge or expire the checkout first, then cancel the booking.
begin;
create or replace function public.mva_protect_booking_payment_cancellation()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='cancelada' and old.status is distinct from 'cancelada'
  and exists(
   select 1 from public.mva_checkout_orders o where o.kind='booking' and o.resource_id=old.id
     and (o.status='paid' or (o.status='pending' and o.stripe_checkout_session_id is not null
       and coalesce(o.session_expires_at,now()+interval '1 hour')>now()))
  ) then
   raise exception 'Reserva com cobrança Stripe ativa: solicite reembolso ou expire a sessão antes de cancelar.'
    using errcode='23514';
 end if;
 return new;
end;
$$;
drop trigger if exists mva_protect_booking_payment_cancellation_trg on public.bookings;
create trigger mva_protect_booking_payment_cancellation_trg
 before update of status on public.bookings
 for each row execute function public.mva_protect_booking_payment_cancellation();
revoke all on function public.mva_protect_booking_payment_cancellation() from public,anon,authenticated;
commit;