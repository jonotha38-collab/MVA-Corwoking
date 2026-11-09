-- Apply AFTER supabase/schema.sql. The historical 000000_init.sql uses a different schema.
begin;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='fiscal_contracts' and column_name='user_id') then
    raise exception 'Apply the current supabase/schema.sql baseline before the fiscal payment migration.';
  end if;
end $$;

alter table public.fiscal_contracts add column if not exists plan_id text;
alter table public.fiscal_contracts add column if not exists payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded','disputed'));
alter table public.fiscal_contracts add column if not exists payment_is_live boolean not null default false;
alter table public.fiscal_contracts add column if not exists payment_order_id uuid unique;
alter table public.fiscal_contracts add column if not exists certificate_number text unique;
alter table public.fiscal_contracts alter column status set default 'pendente_documento';
-- Legacy active contracts deliberately remain unpaid until reconciled with actual payment records.

create table if not exists public.fiscal_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  request_key uuid not null,
  plan_id text not null check (plan_id in ('comercial','fiscal','fiscal_ie')),
  plan_name text not null,
  monthly_cents integer not null check (monthly_cents>0),
  amount integer not null check (amount>0),
  currency text not null default 'brl' check (currency='brl'),
  company jsonb not null,
  transfer boolean not null default false,
  previous_address text not null default '',
  terms_accepted_at timestamptz not null default now(),
  terms_version text not null default 'fiscal-annual-v1',
  stripe_payment_intent text unique,
  livemode boolean not null,
  status text not null default 'pending' check (status in ('pending','paid','refunded','disputed','canceled')),
  contract_id uuid unique references public.fiscal_contracts(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,request_key),
  check (amount = monthly_cents * case when transfer then 8 else 12 end),
  check (not transfer or length(previous_address)>=3)
);
create index if not exists fiscal_orders_user_idx on public.fiscal_payment_orders(user_id,created_at desc);
create table if not exists public.fiscal_payment_events (id text primary key, order_id uuid not null references public.fiscal_payment_orders(id), created_at timestamptz not null default now());
alter table public.fiscal_payment_orders enable row level security;
alter table public.fiscal_payment_events enable row level security;
drop policy if exists fiscal_orders_read on public.fiscal_payment_orders;
create policy fiscal_orders_read on public.fiscal_payment_orders for select to authenticated using (user_id=auth.uid() or public.is_admin());
revoke all on public.fiscal_payment_orders, public.fiscal_payment_events from anon,authenticated;
grant select on public.fiscal_payment_orders to authenticated;
grant all on public.fiscal_payment_orders, public.fiscal_payment_events to service_role;
-- No permissive policy, old or new, may let a browser activate a contract.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='fiscal_contracts' and cmd in ('INSERT','UPDATE','DELETE','ALL') loop
    execute format('drop policy %I on public.fiscal_contracts',p.policyname);
  end loop;
end $$;
revoke insert,update,delete,truncate,references,trigger on public.fiscal_contracts from anon,authenticated;
grant select on public.fiscal_contracts to authenticated;
grant all on public.fiscal_contracts to service_role;

-- All settlement and entitlement changes are atomic and restricted to server credentials.
create or replace function public.settle_fiscal_payment(p_order_id uuid,p_event_id text,p_intent_id text,p_amount integer,p_currency text,p_livemode boolean,p_state text)
returns uuid language plpgsql security definer set search_path=public as $$
declare o public.fiscal_payment_orders%rowtype; contract uuid; paid_day date := (now() at time zone 'UTC')::date;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required'; end if;
  select * into o from public.fiscal_payment_orders where id=p_order_id for update;
  if not found or o.stripe_payment_intent is distinct from p_intent_id or o.amount is distinct from p_amount or o.currency is distinct from p_currency or o.livemode is distinct from p_livemode then raise exception 'Payment verification failed'; end if;
  if p_state not in ('paid','refunded','disputed','canceled') then raise exception 'Invalid state'; end if;
  if exists(select 1 from public.fiscal_payment_events where id=p_event_id) then return o.contract_id; end if;
  contract := o.contract_id;
  if p_state='paid' and o.status='pending' then
    if contract is null then
      insert into public.fiscal_contracts(user_id,company_name,trading_name,cnpj,contact_email,contact_phone,plan_name,plan_id,status,start_date,renewal_date,coworking_provider_name,unit_address,monthly_fee,payment_status,payment_is_live,payment_order_id,certificate_number,alvara_status,alvara_protocol,meeting_hours_allowance)
      values(o.user_id,o.company->>'companyName',coalesce(o.company->>'tradingName',''),o.company->>'cnpj',o.company->>'contactEmail',o.company->>'contactPhone',o.plan_name,o.plan_id,case when o.livemode then 'ativo' else 'em_aprovacao' end,paid_day,(paid_day+interval '1 year')::date,'MVA Coworking Sede','Rua Dom José Thomaz, 565 - São José, Aracaju - SE, CEP 49015-090',o.monthly_cents/100.0,'paid',o.livemode,o.id,'MVA-'||extract(year from paid_day)::text||'-'||upper(replace(o.id::text,'-','')),'em_processamento','',case when o.plan_id='fiscal_ie' then 2 else 0 end)
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
