begin;
-- Modern Stripe API moved current_period_end from Subscription to SubscriptionItem
-- and may nest the invoice's subscription reference under parent.subscription_details.
do $$
declare d text;
begin
 d:=pg_get_functiondef('public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean)'::regprocedure);
 d:=replace(d, '(p_obj->>''current_period_end'')',
      'coalesce(p_obj->>''current_period_end'',p_obj#>>''{items,data,0,current_period_end}'')');
 d:=replace(d, 'sub_id:=p_obj->>''subscription'';',
      'sub_id:=coalesce(p_obj->>''subscription'',p_obj#>>''{parent,subscription_details,subscription}'');');
 if d not like '%items,data,0,current_period_end%' or d not like '%parent,subscription_details,subscription%' then
  raise exception 'Stripe payload compatibility patch failed';
 end if;
 execute d;
end $$;
revoke all on function public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean) to service_role;
commit;