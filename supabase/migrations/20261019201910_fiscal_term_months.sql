-- Apply after 202610190001_fiscal_payments.sql. Existing orders remain annual.
begin;
alter table public.fiscal_payment_orders add column if not exists term_months smallint not null default 12 check (term_months in (1,12));
alter table public.fiscal_contracts add column if not exists term_months smallint not null default 12 check (term_months in (1,12));
alter table public.fiscal_payment_orders alter column terms_version set default 'fiscal-period-v2';

-- Replace the original anonymous price check without depending on its generated name.
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.fiscal_payment_orders'::regclass and contype='c'
    and pg_get_constraintdef(oid) like '%monthly_cents%' and pg_get_constraintdef(oid) like '%amount%'
  loop execute format('alter table public.fiscal_payment_orders drop constraint %I',c.conname); end loop;
end $$;
alter table public.fiscal_payment_orders add constraint fiscal_orders_period_quote_check
  check (amount = monthly_cents * (term_months - case when transfer and term_months=12 then 4 else 0 end));

-- Only service_role can settle a charge. No elevated creator privileges are needed.
create or replace function public.settle_fiscal_payment(p_order_id uuid,p_event_id text,p_intent_id text,p_amount integer,p_currency text,p_livemode boolean,p_state text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.fiscal_payment_orders%rowtype; contract uuid; paid_day date := (now() at time zone 'UTC')::date;
begin
  if current_user is distinct from 'service_role' then raise exception 'Server access required'; end if;
  select * into o from public.fiscal_payment_orders where id=p_order_id for update;
  if not found or o.stripe_payment_intent is distinct from p_intent_id or o.amount is distinct from p_amount or o.currency is distinct from p_currency or o.livemode is distinct from p_livemode then raise exception 'Payment verification failed'; end if;
  if p_state not in ('paid','refunded','disputed','canceled') then raise exception 'Invalid state'; end if;
  if exists(select 1 from public.fiscal_payment_events where id=p_event_id) then return o.contract_id; end if;
  contract := o.contract_id;
  if p_state='paid' and o.status='pending' then
    if contract is null then
      insert into public.fiscal_contracts(user_id,company_name,trading_name,cnpj,contact_email,contact_phone,plan_name,plan_id,status,start_date,renewal_date,coworking_provider_name,unit_address,monthly_fee,term_months,payment_status,payment_is_live,payment_order_id,certificate_number,alvara_status,alvara_protocol,meeting_hours_allowance)
      values(o.user_id,o.company->>'companyName',coalesce(o.company->>'tradingName',''),o.company->>'cnpj',o.company->>'contactEmail',o.company->>'contactPhone',o.plan_name,o.plan_id,case when o.livemode then 'ativo' else 'em_aprovacao' end,paid_day,(paid_day+make_interval(months => o.term_months))::date,'MVA Coworking Sede','Rua Dom José Thomaz, 565 - São José, Aracaju - SE, CEP 49015-090',o.monthly_cents/100.0,o.term_months,'paid',o.livemode,o.id,'MVA-'||extract(year from paid_day)::text||'-'||upper(replace(o.id::text,'-','')),'em_processamento','',case when o.plan_id='fiscal_ie' then 2 else 0 end)
      returning id into contract;
    end if;
    update public.fiscal_payment_orders set status='paid',contract_id=contract,paid_at=now() where id=o.id;
  elsif p_state in ('refunded','disputed') then
    update public.fiscal_payment_orders set status=p_state where id=o.id;
    update public.fiscal_contracts set payment_status=p_state,status='pendente_documento' where id=contract;
  elsif p_state='canceled' and o.status='pending' then
    update public.fiscal_payment_orders set status='canceled' where id=o.id;
  end if;
  -- A delayed paid event cannot reactivate refunded/disputed/canceled orders.
  insert into public.fiscal_payment_events(id,order_id) values(p_event_id,o.id) on conflict do nothing;
  return contract;
end $$;
revoke all on function public.settle_fiscal_payment(uuid,text,text,integer,text,boolean,text) from public,anon,authenticated;
grant execute on function public.settle_fiscal_payment(uuid,text,text,integer,text,boolean,text) to service_role;
commit;
