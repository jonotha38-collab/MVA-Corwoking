-- MVA | Unified Stripe architecture for fiscal plans, coworking subscriptions and Connect bookings.
-- Deliberately OFF in production until keys, webhook and test payments are verified.
begin;

create table if not exists public.mva_billing_settings (
 id smallint primary key default 1 check (id=1),
 checkout_enabled boolean not null default false,
 owner_subscriptions_enabled boolean not null default false,
 connect_enabled boolean not null default false,
 enforce_owner_subscriptions boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.mva_billing_settings (id) values(1) on conflict(id) do nothing;

create table if not exists public.mva_owner_plans (
 id text primary key check(id in('essencial','profissional','business')),
 label text not null,
 monthly_cents integer not null check(monthly_cents>0),
 max_spaces integer not null check(max_spaces>0),
 display_order smallint not null,
 active boolean not null default false,
 created_at timestamptz not null default now()
);
-- Proposed pricing, disabled until the administrator confirms commercial terms.
insert into public.mva_owner_plans(id,label,monthly_cents,max_spaces,display_order,active) values
 ('essencial','Essencial',4990,2,1,false),
 ('profissional','Profissional',9990,8,2,false),
 ('business','Business',19990,25,3,false)
on conflict(id) do nothing;

create table if not exists public.mva_connected_accounts (
 owner_id uuid primary key references auth.users(id) on delete restrict,
 stripe_account_id text not null unique check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 charges_enabled boolean not null default false,
 payouts_enabled boolean not null default false,
 details_submitted boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.mva_owner_subscriptions (
 owner_id uuid primary key references auth.users(id) on delete restrict,
 plan_id text not null references public.mva_owner_plans(id),
 stripe_customer_id text,
 stripe_subscription_id text unique,
 stripe_checkout_session_id text unique,
 status text not null default 'incomplete'
  check(status in('incomplete','incomplete_expired','trialing','active','past_due','unpaid','canceled','paused')),
 current_period_end timestamptz,
 livemode boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.mva_checkout_orders (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in('fiscal','booking')),
 user_id uuid not null references auth.users(id) on delete restrict,
 resource_id uuid not null,
 plan_id text,
 term_months smallint check(term_months in(1,12)),
 stripe_account_id text,
 stripe_checkout_session_id text unique,
 stripe_payment_intent_id text unique,
 stripe_checkout_url text,
 amount_cents integer not null check(amount_cents>0),
 currency text not null default 'brl' check(currency='brl'),
 status text not null default 'pending'
   check(status in('pending','paid','expired','failed','refunded','disputed')),
 livemode boolean not null default false,
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(kind,resource_id)
);
create index if not exists mva_checkout_orders_user_idx on public.mva_checkout_orders(user_id,created_at desc);
create index if not exists mva_checkout_orders_session_idx on public.mva_checkout_orders(stripe_checkout_session_id);
create table if not exists public.mva_stripe_webhook_events (
 id text primary key,
 event_type text not null,
 stripe_account_id text,
 received_at timestamptz not null default now()
);

alter table public.mva_billing_settings enable row level security;
alter table public.mva_owner_plans enable row level security;
alter table public.mva_connected_accounts enable row level security;
alter table public.mva_owner_subscriptions enable row level security;
alter table public.mva_checkout_orders enable row level security;
alter table public.mva_stripe_webhook_events enable row level security;

create policy billing_settings_read on public.mva_billing_settings for select to anon,authenticated using(true);
create policy owner_plans_read on public.mva_owner_plans for select to anon,authenticated using(true);
create policy connected_account_read on public.mva_connected_accounts for select to authenticated
 using(owner_id=(select auth.uid()) or (select public.is_admin()));
create policy owner_subscription_read on public.mva_owner_subscriptions for select to authenticated
 using(owner_id=(select auth.uid()) or (select public.is_admin()));
create policy checkout_orders_read on public.mva_checkout_orders for select to authenticated
 using(user_id=(select auth.uid()) or (select public.is_admin()));

grant select on public.mva_billing_settings,public.mva_owner_plans to anon,authenticated;
grant select on public.mva_connected_accounts,public.mva_owner_subscriptions,public.mva_checkout_orders to authenticated;
revoke all on public.mva_stripe_webhook_events from anon,authenticated;
-- No direct client writes. Service role updates are validated by verified Stripe webhooks.
revoke insert,update,delete on public.mva_billing_settings,public.mva_owner_plans,
 public.mva_connected_accounts,public.mva_owner_subscriptions,public.mva_checkout_orders
 from anon,authenticated;

-- Process verified Stripe event summaries atomically to prevent double fulfillment.
-- Only the service role is granted execution; the Edge Function first verifies the Stripe signature.
create or replace function public.mva_apply_verified_stripe_event(
 p_id text, p_type text, p_obj jsonb, p_account text default null, p_livemode boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 inserted boolean;
 sess text;
 order_row public.mva_checkout_orders%rowtype;
 sub_id text;
 owner_id uuid;
 plan text;
 status_value text;
 period_epoch bigint;
 stripe_cust text;
 currency_value text;
 amt bigint;
begin
 if current_user <> 'service_role' then
  raise exception 'Only service_role may process Stripe webhooks' using errcode='42501';
 end if;
 if length(coalesce(p_id,''))<5 or length(coalesce(p_type,''))<5 then
  raise exception 'Invalid Stripe event';
 end if;
 insert into public.mva_stripe_webhook_events(id,event_type,stripe_account_id)
 values(p_id,p_type,p_account) on conflict(id) do nothing;
 get diagnostics inserted = row_count;
 if not inserted then return jsonb_build_object('duplicate',true); end if;

 if p_type in('checkout.session.completed','checkout.session.async_payment_succeeded') then
  sess:=p_obj->>'id';
  select * into order_row from public.mva_checkout_orders where stripe_checkout_session_id=sess for update;
  if found then
   amt:=coalesce((p_obj->>'amount_total')::bigint,0);
   currency_value:=lower(coalesce(p_obj->>'currency',''));
   if (order_row.stripe_account_id is distinct from p_account)
      or (order_row.livemode is distinct from p_livemode)
      or order_row.amount_cents<>amt or currency_value<>'brl' then
    raise exception 'Payment session mismatch: %',sess;
   end if;
   if p_obj->>'payment_status'='paid' and order_row.status='pending' then
    update public.mva_checkout_orders set status='paid',paid_at=now(),
      stripe_payment_intent_id=nullif(p_obj->>'payment_intent',''),updated_at=now()
     where id=order_row.id;
    -- Deliberately do not activate a fiscal address. Approval/contract are a separate step.
   end if;
  elsif p_obj->>'mode'='subscription' then
   sub_id:=p_obj->>'subscription';
   update public.mva_owner_subscriptions set
      stripe_subscription_id=coalesce(nullif(sub_id,''),stripe_subscription_id),
      stripe_customer_id=coalesce(nullif(p_obj->>'customer',''),stripe_customer_id),
      updated_at=now()
    where stripe_checkout_session_id=sess and livemode=p_livemode;
  end if;
 elsif p_type='checkout.session.expired' then
  update public.mva_checkout_orders set status='expired',updated_at=now()
   where stripe_checkout_session_id=p_obj->>'id' and status='pending';
 elsif p_type in('customer.subscription.created','customer.subscription.updated','customer.subscription.deleted') then
  sub_id:=p_obj->>'id';
  status_value:=coalesce(p_obj->>'status','incomplete');
  if status_value not in('incomplete','incomplete_expired','trialing','active','past_due','unpaid','canceled','paused') then
   raise exception 'Unknown subscription status';
  end if;
  plan:=p_obj#>>'{metadata,mva_plan_id}';
  begin owner_id:=(p_obj#>>'{metadata,mva_owner_id}')::uuid;
  exception when invalid_text_representation then owner_id:=null; end;
  if owner_id is not null and plan in('essencial','profissional','business') then
   update public.mva_owner_subscriptions set
    stripe_subscription_id=coalesce(nullif(sub_id,''),stripe_subscription_id),
    stripe_customer_id=coalesce(nullif(p_obj->>'customer',''),stripe_customer_id),
    plan_id=plan,status=status_value,
    current_period_end=case
      when (p_obj->>'current_period_end') ~ '^[0-9]+$'
        then to_timestamp((p_obj->>'current_period_end')::bigint)
      else current_period_end end,
    updated_at=now()
   where owner_id=owner_id and plan_id=plan and livemode=p_livemode
     and (stripe_subscription_id is null or stripe_subscription_id=sub_id);
  else
   update public.mva_owner_subscriptions set status=status_value,updated_at=now()
    where stripe_subscription_id=sub_id and livemode=p_livemode;
  end if;
 elsif p_type in('invoice.paid','invoice.payment_failed') then
  sub_id:=p_obj->>'subscription';
  if sub_id is not null then
   status_value:=case when p_type='invoice.paid' then 'active' else 'past_due' end;
   period_epoch:=nullif(p_obj#>>'{lines,data,0,period,end}','')::bigint;
   update public.mva_owner_subscriptions set status=status_value,
    current_period_end=case
      when period_epoch is not null then to_timestamp(period_epoch)
      else current_period_end end,
    updated_at=now()
    where stripe_subscription_id=sub_id and livemode=p_livemode;
  end if;
 elsif p_type='account.updated' then
  update public.mva_connected_accounts set
   charges_enabled=coalesce((p_obj->>'charges_enabled')::boolean,false),
   payouts_enabled=coalesce((p_obj->>'payouts_enabled')::boolean,false),
   details_submitted=coalesce((p_obj->>'details_submitted')::boolean,false),
   updated_at=now()
   where stripe_account_id=p_obj->>'id';
 elsif p_type in('charge.refunded','charge.dispute.created') then
  sess:=nullif(p_obj->>'payment_intent','');
  if sess is not null then
   update public.mva_checkout_orders set
    status=case when p_type='charge.refunded' then 'refunded' else 'disputed' end,
    updated_at=now()
    where stripe_payment_intent_id=sess
      and stripe_account_id is not distinct from p_account
      and livemode=p_livemode and status='paid'
      and (p_type<>'charge.refunded' or
        coalesce((p_obj->>'amount_refunded')::bigint,0)>=amount_cents);
  end if;
 end if;

 return jsonb_build_object('processed',true);
end;
$$;
revoke all on function public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean)
 from public,anon,authenticated;
grant execute on function public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean) to service_role;

commit;