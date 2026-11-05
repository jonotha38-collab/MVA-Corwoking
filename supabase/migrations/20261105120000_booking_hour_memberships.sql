-- MVA booking memberships: Stripe monthly hours with atomic redemption and partner-safe booking.
-- This migration mirrors the verified Supabase production schema, November 5, 2026.
begin;
create table if not exists public.mva_booking_plans(
 id text primary key check(id in('bronze','prata','ouro')),
 label text not null, monthly_cents integer not null check(monthly_cents>0),
 included_minutes integer not null check(included_minutes>0),
 stripe_live_price_id text not null unique check(stripe_live_price_id like 'price_%'),
 eligible_category text not null default 'atendimento' check(eligible_category='atendimento'),
 active boolean not null default false,display_order smallint not null
);
insert into public.mva_booking_plans(id,label,monthly_cents,included_minutes,stripe_live_price_id,active,display_order) values
 ('bronze','Bronze',13900,240,'price_1UYQn131eJ9Ivl6iAqtp2VY6',true,1),
 ('prata','Prata',25900,480,'price_1UYQn431eJ9Ivl6iSjb5JrLC',true,2),
 ('ouro','Ouro',35900,720,'price_1UYQn731eJ9Ivl6isUq2toGn',true,3)
on conflict(id) do update set label=excluded.label,monthly_cents=excluded.monthly_cents,
 included_minutes=excluded.included_minutes,stripe_live_price_id=excluded.stripe_live_price_id,
 active=excluded.active,display_order=excluded.display_order;
create table if not exists public.mva_booking_memberships(
 user_id uuid primary key references auth.users(id) on delete restrict,
 plan_id text not null references public.mva_booking_plans(id),
 stripe_checkout_session_id text unique,
 stripe_subscription_id text unique,
 stripe_customer_id text,
 status text not null default 'incomplete' check(status in(
  'incomplete','incomplete_expired','trialing','active','past_due','unpaid','canceled','paused')),
 livemode boolean not null default true,
 paid_period_start timestamptz,
 paid_period_end timestamptz,
 current_period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 last_paid_invoice_id text,
 updated_at timestamptz not null default now(),
 constraint membership_period_order check(paid_period_start is null or paid_period_end>paid_period_start)
);
create table if not exists public.mva_booking_redemptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 booking_id uuid not null unique references public.bookings(id) on delete restrict,
 period_start timestamptz not null,
 period_end timestamptz not null,
 minutes integer not null check(minutes>=60 and minutes<=960 and minutes%60=0),
 status text not null default 'applied' check(status in('applied','reversed')),
 created_at timestamptz not null default now(),
 reversed_at timestamptz
);
create index if not exists mva_booking_redemptions_user_period
 on public.mva_booking_redemptions(user_id,period_start,status);
create table if not exists public.mva_booking_plan_webhook_events(
 id text primary key,processed_at timestamptz not null default now()
);
alter table public.mva_booking_plans enable row level security;
alter table public.mva_booking_memberships enable row level security;
alter table public.mva_booking_redemptions enable row level security;
alter table public.mva_booking_plan_webhook_events enable row level security;
drop policy if exists mva_booking_plans_read on public.mva_booking_plans;
create policy mva_booking_plans_read on public.mva_booking_plans for select to anon,authenticated using(true);
drop policy if exists mva_booking_memberships_read on public.mva_booking_memberships;
create policy mva_booking_memberships_read on public.mva_booking_memberships
 for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
drop policy if exists mva_booking_redemptions_read on public.mva_booking_redemptions;
create policy mva_booking_redemptions_read on public.mva_booking_redemptions
 for select to authenticated using(user_id=(select auth.uid()) or (select public.is_admin()));
grant select on public.mva_booking_plans to anon,authenticated;
grant select on public.mva_booking_memberships,public.mva_booking_redemptions to authenticated;
revoke insert,update,delete on public.mva_booking_plans,public.mva_booking_memberships,
 public.mva_booking_redemptions from anon,authenticated;
revoke all on public.mva_booking_plan_webhook_events from anon,authenticated;
-- Correct exactly the administrator-owned MVA rooms at the official HQ address.
update public.spaces s set is_mva_headquarters=true where s.is_mva_headquarters=false
 and s.coworking_name='MVA Coworking' and s.city='Aracaju' and s.state='SE'
 and lower(s.street) like '%dom jose thomaz 565%'
 and exists(select 1 from public.profiles pr where pr.id=s.owner_id and pr.is_admin=true);

CREATE OR REPLACE FUNCTION public.mva_apply_booking_plan_event(p_id text, p_type text, p_obj jsonb, p_live boolean, p_sub jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid; plan text; sub_id text; state text; cust text;
 st bigint; en bigint; v_price text; expected_price text;
 inserted integer;
begin
 if p_live is distinct from true then return jsonb_build_object('ignored',true); end if;
 if p_type='checkout.session.completed' and p_obj->>'mode'='subscription' then
   plan:=p_obj#>>'{metadata,mva_booking_plan}';
   if plan is null then return jsonb_build_object('ignored',true); end if;
   uid:=nullif(p_obj#>>'{metadata,mva_user_id}','')::uuid;
   sub_id:=nullif(p_obj->>'subscription','');
   cust:=nullif(p_obj->>'customer','');
 elsif p_type like 'customer.subscription.%' then
   plan:=p_obj#>>'{metadata,mva_booking_plan}';
   if plan is null then return jsonb_build_object('ignored',true); end if;
   uid:=nullif(p_obj#>>'{metadata,mva_user_id}','')::uuid;
   sub_id:=p_obj->>'id';
   cust:=nullif(p_obj->>'customer','');
   state:=p_obj->>'status';
 elsif p_type in('invoice.paid','invoice.payment_failed') then
   plan:=p_sub#>>'{metadata,mva_booking_plan}';
   if plan is null then return jsonb_build_object('ignored',true); end if;
   uid:=nullif(p_sub#>>'{metadata,mva_user_id}','')::uuid;
   sub_id:=p_sub->>'id';
   cust:=nullif(p_sub->>'customer','');
   v_price:=p_sub#>>'{items,data,0,price,id}';
   select stripe_live_price_id into expected_price from public.mva_booking_plans where id=plan;
   if expected_price is null or expected_price<>v_price then
     raise exception 'Stripe subscription price mismatch'; end if;
 else
   return jsonb_build_object('ignored',true);
 end if;
 if uid is null or plan not in('bronze','prata','ouro') or sub_id is null then
   raise exception 'Invalid subscription metadata'; end if;
 insert into public.mva_booking_plan_webhook_events(id) values(p_id) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return jsonb_build_object('duplicate',true); end if;
 if p_type like 'customer.subscription.%' then
  if state not in('incomplete','incomplete_expired','trialing','active','past_due','unpaid','canceled','paused')
    then raise exception 'Invalid Stripe subscription status'; end if;
 end if;
 insert into public.mva_booking_memberships(user_id,plan_id,stripe_subscription_id,
      stripe_customer_id,status,livemode,updated_at)
 values(uid,plan,sub_id,cust,coalesce(state,'incomplete'),true,now())
 on conflict(user_id) do update set
  plan_id=excluded.plan_id,stripe_subscription_id=excluded.stripe_subscription_id,
  stripe_customer_id=coalesce(excluded.stripe_customer_id,public.mva_booking_memberships.stripe_customer_id),
  status=case when p_type like 'customer.subscription.%' then excluded.status
      else public.mva_booking_memberships.status end,
  livemode=true,updated_at=now()
 where public.mva_booking_memberships.stripe_subscription_id is null or
       public.mva_booking_memberships.stripe_subscription_id=excluded.stripe_subscription_id or
       public.mva_booking_memberships.status in('canceled','incomplete_expired','unpaid');
 if p_type='checkout.session.completed' then
  update public.mva_booking_memberships set
   stripe_checkout_session_id=p_obj->>'id',updated_at=now() where user_id=uid and stripe_subscription_id=sub_id;
 elsif p_type like 'customer.subscription.%' then
  update public.mva_booking_memberships set
   status=state,cancel_at_period_end=coalesce((p_obj->>'cancel_at_period_end')::boolean,false),
   current_period_end=case
      when coalesce(p_obj->>'current_period_end',p_obj#>>'{items,data,0,current_period_end}') ~ '^[0-9]+$'
      then to_timestamp(coalesce(p_obj->>'current_period_end',p_obj#>>'{items,data,0,current_period_end}')::bigint)
      else current_period_end end, updated_at=now()
   where user_id=uid and stripe_subscription_id=sub_id;
 elsif p_type='invoice.paid' then
  if p_obj->>'status'<>'paid' or lower(coalesce(p_obj->>'currency',''))<>'brl' or
     coalesce((p_obj->>'amount_paid')::bigint,0)<=0 then
      raise exception 'Subscription invoice not actually paid'; end if;
  st:=nullif(p_obj#>>'{lines,data,0,period,start}','')::bigint;
  en:=nullif(p_obj#>>'{lines,data,0,period,end}','')::bigint;
  if st is null or en is null or en<=st then raise exception 'Invalid paid period'; end if;
  update public.mva_booking_memberships
   set status='active', paid_period_start=to_timestamp(st),
     paid_period_end=to_timestamp(en),current_period_end=to_timestamp(en),
     last_paid_invoice_id=p_obj->>'id',updated_at=now()
   where user_id=uid and stripe_subscription_id=sub_id
     and (paid_period_end is null or paid_period_end<=to_timestamp(en));
 elsif p_type='invoice.payment_failed' then
  update public.mva_booking_memberships set status='past_due',updated_at=now()
   where user_id=uid and stripe_subscription_id=sub_id;
 end if;
 return jsonb_build_object('processed',true);
end;
$function$


CREATE OR REPLACE FUNCTION public.mva_block_checkout_if_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if new.kind='booking' then
  perform 1 from public.bookings where id=new.resource_id for update;
  if exists(select 1 from public.mva_booking_redemptions
    where booking_id=new.resource_id and status='applied') then
   raise exception 'Reserva já coberta pelo plano de horas; cobrança duplicada impedida.';
  end if;
 end if;
 return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.mva_redeem_booking_credit(p_user uuid, p_booking uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 m public.mva_booking_memberships%rowtype;
 b public.bookings%rowtype;
 s public.spaces%rowtype;
 quota integer; used integer; duration integer;
 slot_start timestamptz;
 prior public.mva_booking_redemptions%rowtype;
begin
 select * into m from public.mva_booking_memberships where user_id=p_user for update;
 if not found or m.status<>'active' or m.livemode is not true or
     m.paid_period_start is null or now() not between m.paid_period_start and m.paid_period_end
 then raise exception 'Plano mensal não está ativo e pago.'; end if;
 select included_minutes into quota from public.mva_booking_plans
 where id=m.plan_id and active=true;
 if quota is null then raise exception 'Plano não disponível.'; end if;
 select * into b from public.bookings where id=p_booking and user_id=p_user for update;
 if not found or b.status<>'confirmada' then raise exception 'Reserva indisponível.'; end if;
 select * into prior from public.mva_booking_redemptions where booking_id=p_booking;
 if found then
  if prior.status='applied' then return jsonb_build_object('covered',true,'remaining_minutes',
   quota-(select coalesce(sum(minutes),0) from public.mva_booking_redemptions
     where user_id=p_user and period_start=m.paid_period_start and status='applied'));
  end if;
  raise exception 'Reserva já cancelada não pode reutilizar crédito.';
 end if;
 select * into s from public.spaces where id=b.space_id;
 if not found or not s.is_mva_headquarters or s.category<>'atendimento' or
   s.approval<>'aprovado' or s.status<>'available' then
   raise exception 'Este plano é exclusivo para salas de atendimento próprias da MVA.';
 end if;
 if cardinality(b.addons)>0 then raise exception 'Adicionais devem ser contratados separadamente, fora do plano.'; end if;
 duration:=round(extract(epoch from (b.end_time-b.start_time))/60)::integer;
 if duration<60 or duration>960 or duration%60<>0 or
   abs(b.duration_hours*60-duration)>0.01 then raise exception 'Duração de reserva inválida.'; end if;
 slot_start:=(b.booking_date+b.start_time) at time zone 'America/Maceio';
 if slot_start<=now() or slot_start<m.paid_period_start or
   (b.booking_date+b.end_time) at time zone 'America/Maceio' >m.paid_period_end then
   raise exception 'O atendimento deve ocorrer durante o período mensal já pago.'; end if;
 if exists(select 1 from public.mva_checkout_orders o where o.kind='booking' and
      o.resource_id=b.id and o.status not in('expired','failed')) then
   raise exception 'Esta reserva já possui tentativa de pagamento Stripe. Não é possível debitar horas.'; end if;
 select coalesce(sum(minutes),0)::integer into used
 from public.mva_booking_redemptions
 where user_id=p_user and period_start=m.paid_period_start and status='applied';
 if used+duration>quota then raise exception 'Saldo de horas insuficiente para esta reserva.'; end if;
 insert into public.mva_booking_redemptions(user_id,booking_id,period_start,period_end,minutes)
 values(p_user,p_booking,m.paid_period_start,m.paid_period_end,duration);
 return jsonb_build_object('covered',true,'remaining_minutes',quota-used-duration);
end;
$function$


CREATE OR REPLACE FUNCTION public.mva_reverse_booking_credit_on_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if old.status<>'cancelada' and new.status='cancelada'
   and (old.booking_date+old.start_time) at time zone 'America/Maceio' >= now()+interval '24 hours' then
  update public.mva_booking_redemptions set status='reversed',reversed_at=now()
   where booking_id=old.id and status='applied';
 end if;
 return new;
end;
$function$


revoke all on function public.mva_apply_booking_plan_event(text,text,jsonb,boolean,jsonb)
 from public,anon,authenticated;
grant execute on function public.mva_apply_booking_plan_event(text,text,jsonb,boolean,jsonb) to service_role;
revoke all on function public.mva_redeem_booking_credit(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mva_redeem_booking_credit(uuid,uuid) to service_role;
revoke all on function public.mva_block_checkout_if_credit() from public,anon,authenticated;
revoke all on function public.mva_reverse_booking_credit_on_cancel() from public,anon,authenticated;
drop trigger if exists mva_block_checkout_if_credit_trg on public.mva_checkout_orders;
create trigger mva_block_checkout_if_credit_trg before insert or update of status on public.mva_checkout_orders
 for each row execute function public.mva_block_checkout_if_credit();
drop trigger if exists mva_reverse_booking_credit_on_cancel_trg on public.bookings;
create trigger mva_reverse_booking_credit_on_cancel_trg after update of status on public.bookings
 for each row execute function public.mva_reverse_booking_credit_on_cancel();
commit;
