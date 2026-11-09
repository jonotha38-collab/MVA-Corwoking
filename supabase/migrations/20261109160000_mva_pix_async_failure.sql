begin;
CREATE OR REPLACE FUNCTION public.mva_apply_verified_stripe_event(p_id text, p_type text, p_obj jsonb, p_account text DEFAULT NULL::text, p_livemode boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 inserted boolean;
 sess text;
 order_row public.mva_checkout_orders%rowtype;
 sub_id text;
 v_owner_id uuid;
 plan text;
 status_value text;
 period_epoch bigint;
 stripe_cust text;
 currency_value text;
 amt bigint;
begin
 -- Execution is limited via REVOKE/GRANT to service_role.
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
   sub_id:=coalesce(p_obj->>'subscription',p_obj#>>'{parent,subscription_details,subscription}');
   update public.mva_owner_subscriptions set
      stripe_subscription_id=coalesce(nullif(sub_id,''),stripe_subscription_id),
      stripe_customer_id=coalesce(nullif(p_obj->>'customer',''),stripe_customer_id),
      updated_at=now()
    where stripe_checkout_session_id=sess and livemode=p_livemode;
  end if;
 elsif p_type='checkout.session.async_payment_failed' then
  -- Failed asynchronous Pix payments never grant an address or booking.
  -- The client may start another checkout only after this signed notification.
  update public.mva_checkout_orders set status='failed',updated_at=now()
   where stripe_checkout_session_id=p_obj->>'id' and status='pending'
     and livemode=p_livemode and stripe_account_id is not distinct from p_account;
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
  begin v_owner_id:=(p_obj#>>'{metadata,mva_owner_id}')::uuid;
  exception when invalid_text_representation then v_owner_id:=null; end;
  if v_owner_id is not null and plan in('essencial','profissional','business') then
   update public.mva_owner_subscriptions set
    stripe_subscription_id=coalesce(nullif(sub_id,''),stripe_subscription_id),
    stripe_customer_id=coalesce(nullif(p_obj->>'customer',''),stripe_customer_id),
    plan_id=plan,status=status_value,
    current_period_end=case
      when coalesce(p_obj->>'current_period_end',p_obj#>>'{items,data,0,current_period_end}') ~ '^[0-9]+$'
        then to_timestamp(coalesce(p_obj->>'current_period_end',p_obj#>>'{items,data,0,current_period_end}')::bigint)
      else current_period_end end,
    updated_at=now()
   where owner_id=v_owner_id and plan_id=plan and livemode=p_livemode
     and (stripe_subscription_id is null or stripe_subscription_id=sub_id);
  else
   update public.mva_owner_subscriptions set status=status_value,updated_at=now()
    where stripe_subscription_id=sub_id and livemode=p_livemode;
  end if;
 elsif p_type in('invoice.paid','invoice.payment_failed') then
  sub_id:=coalesce(p_obj->>'subscription',p_obj#>>'{parent,subscription_details,subscription}');
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
$function$;
commit;