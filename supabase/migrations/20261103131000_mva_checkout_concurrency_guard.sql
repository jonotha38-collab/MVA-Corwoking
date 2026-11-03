begin;
alter table public.mva_checkout_orders
 add column if not exists checkout_lock_until timestamptz,
 add column if not exists session_expires_at timestamptz;
-- Safe claim: service role only; prevents creating multiple simultaneously payable sessions.
create or replace function public.mva_claim_checkout_order(p_order uuid)
 returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 update public.mva_checkout_orders
 set checkout_lock_until=now()+interval '90 seconds',updated_at=now()
 where id=p_order and status in('pending','expired','failed')
   and (checkout_lock_until is null or checkout_lock_until<now())
   and (stripe_checkout_session_id is null or
        (session_expires_at is not null and session_expires_at<now()));
 get diagnostics n=row_count;
 return n=1;
end;
$$;
revoke all on function public.mva_claim_checkout_order(uuid) from public,anon,authenticated;
grant execute on function public.mva_claim_checkout_order(uuid) to service_role;

-- Do not enable subscriptions for owner listings without a billing-policy rollout.
create or replace function public.mva_can_publish_owner_space(p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select not coalesce((select enforce_owner_subscriptions from public.mva_billing_settings where id=1),false)
 or exists (
  select 1 from public.mva_owner_subscriptions s
  where s.owner_id=p_owner and s.status in('active','trialing')
    and (s.current_period_end is null or s.current_period_end>now())
 );
$$;
revoke all on function public.mva_can_publish_owner_space(uuid) from public,anon,authenticated;
grant execute on function public.mva_can_publish_owner_space(uuid) to service_role;
commit;