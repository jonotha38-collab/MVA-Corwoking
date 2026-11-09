begin;
-- Only the authenticated customer can read their own current room perks.
create or replace function public.mva_my_fiscal_room_benefits()
returns jsonb language plpgsql security invoker stable set search_path='' as $$
declare
 v_user uuid:=(select auth.uid());
 v_now date:=(now() at time zone 'America/Maceio')::date;
 v_plan text;
 v_pct integer;
 v_limit numeric;
 v_months integer;
 v_first date;
 v_cycle date;
 v_end date;
 v_used numeric:=0;
 v_i integer;
begin
 if v_user is null then return jsonb_build_object('active',false); end if;
 select c.plan_id,p.room_discount_percent,p.bonus_hours_per_month,p.bonus_months
 into v_plan,v_pct,v_limit,v_months
 from public.fiscal_contracts c join public.mva_fiscal_prices p on p.id=c.plan_id
 where c.user_id=v_user and c.plan_id in ('mva_essencial','mva_profissional','mva_excellence')
   and c.status='ativo' and c.payment_status='paid' and c.payment_is_live=true
   and v_now between c.start_date and c.renewal_date
 order by p.room_discount_percent desc,c.start_date desc limit 1;
 if v_plan is null then return jsonb_build_object('active',false);end if;
 v_limit:=0+v_limit;
 if v_plan='mva_excellence' and v_months>0 then
  select min(c.start_date) into v_first from public.fiscal_contracts c
   where c.user_id=v_user and c.plan_id='mva_excellence' and c.formalized_at is not null;
  if v_first is not null then
   for v_i in 0..least(3,v_months)-1 loop
    v_cycle:=(v_first+make_interval(months=>v_i))::date;
    v_end:=(v_first+make_interval(months=>v_i+1))::date;
    if v_now>=v_cycle and v_now<v_end then
     select coalesce(sum(b.fiscal_bonus_hours),0) into v_used
      from public.bookings b
      where b.user_id=v_user and b.fiscal_bonus_cycle=v_cycle and b.status<>'cancelada';
     exit;
    end if;
    v_cycle:=null;
   end loop;
  end if;
 end if;
 if v_cycle is null then v_limit:=0;v_used:=0;end if;
 return jsonb_build_object(
  'active',true,'planId',v_plan,'roomDiscountPercent',v_pct,
  'bonusHoursTotal',v_limit,'bonusHoursUsed',v_used,
  'bonusHoursRemaining',greatest(0,v_limit-v_used),
  'bonusCycleEnd',case when v_end is not null then v_end-1 else null end,
  'nonCumulative',true
 );
end;
$$;
revoke all on function public.mva_my_fiscal_room_benefits() from public,anon,authenticated;
grant execute on function public.mva_my_fiscal_room_benefits() to authenticated;
commit;