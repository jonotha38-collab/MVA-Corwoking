begin;
-- Meeting-room discounts only: 0% / 5% / 10%, without changing any prices
-- or existing 2h bonus in the Excellence plan.
alter table public.mva_fiscal_prices
  add column if not exists accountant_consultations_per_contract integer not null default 0;
alter table public.mva_fiscal_prices drop constraint if exists mva_fiscal_accountant_count_check;
alter table public.mva_fiscal_prices add constraint mva_fiscal_accountant_count_check
  check(accountant_consultations_per_contract between 0 and 5);
update public.mva_fiscal_prices set
 room_discount_percent=case id
   when 'mva_essencial' then 0 when 'mva_profissional' then 5 when 'mva_excellence' then 10 end,
 accountant_consultations_per_contract=case when id='mva_excellence' then 1 else 0 end,
 updated_at=now()
 where id in('mva_essencial','mva_profissional','mva_excellence');
-- Confirm the known premium bonus in the server-side contract record.
CREATE OR REPLACE FUNCTION public.mva_prepare_paid_fiscal_contract()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 a public.fiscal_applications%rowtype;
 v_unit public.fiscal_units%rowtype;
 plan_label text;
 plan_cents integer;
 hours integer;
begin
 if new.kind<>'fiscal' then return new; end if;

 -- Refunds and disputes immediately suspend address authorization.
 if new.status in('refunded','disputed') and
    new.status is distinct from old.status then
  update public.fiscal_contracts
   set status='em_aprovacao',payment_status=new.status
   where payment_order_id=new.id and payment_is_live=true;
  return new;
 end if;

 if new.status<>'paid' or new.livemode is not true then return new; end if;
 if tg_op='UPDATE' and old.status='paid' then return new; end if;

 select * into a from public.fiscal_applications
  where id=new.resource_id and user_id=new.user_id;
 if not found or a.status<>'approved' or a.plan_id is distinct from new.plan_id
  or a.term_months is distinct from new.term_months then
   -- Stripe payment remains recorded; admin must reconcile irregular requests.
   raise warning 'Fiscal paid order % needs manual application reconciliation',new.id;
   return new;
 end if;
 if a.unit_id is not null then
  select * into v_unit from public.fiscal_units where id=a.unit_id;
 else
  select * into v_unit from public.fiscal_units
   where active=true and name='MVA Coworking — Sede' order by approved_at desc nulls last limit 1;
 end if;
 if not found or v_unit.active is not true then
  raise warning 'Fiscal paid order % needs an approved fiscal unit',new.id;
  return new;
 end if;
 select name,monthly_cents into plan_label,plan_cents
  from public.mva_fiscal_prices where id=a.plan_id;
 if plan_cents is null then
  raise warning 'Fiscal paid order % has missing plan',new.id;
  return new;
 end if;
 hours:=case when a.plan_id in ('fiscal_ie','mva_excellence') then 2 else 0 end;
 insert into public.fiscal_contracts(
    user_id,application_id,payment_order_id,company_name,trading_name,cnpj,
    contact_email,contact_phone,plan_name,plan_id,term_months,status,
    start_date,renewal_date,coworking_provider_name,unit_address,monthly_fee,
    meeting_hours_allowance,payment_status,payment_is_live
 ) values(
    a.user_id,a.id,new.id,a.company_name,a.trading_name,a.cnpj,
    a.contact_email,a.contact_phone,plan_label,a.plan_id,a.term_months,
    'em_aprovacao',current_date,current_date,'MVA Coworking — Sede',
    v_unit.street_address,plan_cents::numeric/100,hours,'paid',true
 ) on conflict(payment_order_id) do nothing;
 return new;
end;
$function$

commit;