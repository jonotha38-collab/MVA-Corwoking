-- Prevent parallel Stripe sessions on different tiers and allow safe retry after abandonment.
begin;
alter table public.mva_booking_memberships add column if not exists checkout_lock_until timestamptz;

create or replace function public.mva_claim_booking_plan_checkout(p_user uuid,p_plan text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v public.mva_booking_memberships%rowtype;
begin
 if p_user is null or p_plan not in ('bronze','prata','ouro') then return false; end if;
 insert into public.mva_booking_memberships(user_id,plan_id,status,livemode)
 values(p_user,p_plan,'incomplete',true)
 on conflict(user_id) do nothing;
 select * into v from public.mva_booking_memberships where user_id=p_user for update;
 if not found then return false; end if;
 if v.checkout_lock_until is not null and v.checkout_lock_until>now() then
  return false;
 end if;
 if v.stripe_subscription_id is not null
   and v.status not in('canceled','incomplete_expired') then
  return false;
 end if;
 update public.mva_booking_memberships
 set checkout_lock_until=now()+interval '120 seconds',updated_at=now()
 where user_id=p_user;
 return true;
end;
$$;
revoke all on function public.mva_claim_booking_plan_checkout(uuid,text)
 from public,anon,authenticated;
grant execute on function public.mva_claim_booking_plan_checkout(uuid,text) to service_role;
commit;