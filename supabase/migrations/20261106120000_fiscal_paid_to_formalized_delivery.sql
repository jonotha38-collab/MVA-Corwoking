-- Fiscal fulfillment: Stripe-paid orders become human-review contracts,
-- and signed documents are delivered only after explicit MVA approval.
begin;

alter table public.fiscal_contracts
  add column if not exists application_id uuid unique references public.fiscal_applications(id) on delete restrict,
  add column if not exists formalized_by uuid references auth.users(id),
  add column if not exists formalized_at timestamptz,
  add column if not exists formalization_notes text not null default '';

create index if not exists fiscal_contracts_application_idx
  on public.fiscal_contracts(application_id);

-- Admin approval is never inferred from a successful payment.
create or replace function public.mva_prepare_paid_fiscal_contract()
returns trigger language plpgsql security definer set search_path='' as $$
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
 hours:=case when a.plan_id='fiscal_ie' then 2 else 0 end;
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
$$;
drop trigger if exists mva_paid_fiscal_to_formalization on public.mva_checkout_orders;
create trigger mva_paid_fiscal_to_formalization
 after insert or update of status on public.mva_checkout_orders
 for each row execute function public.mva_prepare_paid_fiscal_contract();
revoke all on function public.mva_prepare_paid_fiscal_contract() from public,anon,authenticated;

-- A human administrator approves the signed documents and activates the contract
-- in a single transaction. Payment events alone can never invoke this function.
create or replace function public.mva_finalize_fiscal_contract(
  p_contract uuid,p_confirm_review boolean,p_notes text default '')
returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 c public.fiscal_contracts%rowtype;
 o public.mva_checkout_orders%rowtype;
 a public.fiscal_applications%rowtype;
 doc_count integer;
 needs_authorization boolean;
begin
 if (select auth.uid()) is null or not public.is_admin() then
  raise exception 'Somente a administração da MVA pode formalizar o contrato.'
    using errcode='42501';
 end if;
 if p_confirm_review is distinct from true then
  raise exception 'Confirme a conferência humana dos dados, documentos e assinaturas.'
    using errcode='22023';
 end if;
 select * into c from public.fiscal_contracts where id=p_contract for update;
 if not found then raise exception 'Contrato não encontrado.'; end if;
 if c.status='ativo' and c.formalized_at is not null then
  return jsonb_build_object('active',true,'contractId',c.id,'alreadyActive',true);
 end if;
 if c.status not in ('em_aprovacao','pendente_documento') then
  raise exception 'Estado contratual inválido para formalização.'; end if;
 select * into o from public.mva_checkout_orders where id=c.payment_order_id for update;
 if not found or o.kind<>'fiscal' or o.status<>'paid' or o.livemode is not true
  or c.payment_status<>'paid' or c.payment_is_live is not true
  or o.user_id<>c.user_id or o.resource_id<>c.application_id
  then raise exception 'Pagamento real não confirmado ou vinculação contratual inválida.'; end if;
 select * into a from public.fiscal_applications where id=c.application_id;
 if not found or a.status<>'approved'
  or a.plan_id is distinct from c.plan_id
  or a.term_months is distinct from c.term_months
 then raise exception 'Elegibilidade da empresa não está aprovada.'; end if;

 if not exists (
  select 1 from public.fiscal_private_documents d
   join storage.objects f on f.bucket_id='fiscal-private' and f.name=d.file_path
   where d.contract_id=c.id and d.category='contract'
     and d.file_path ~* '[.]pdf$'
 ) then raise exception 'Anexe o contrato assinado em PDF antes da liberação.'; end if;

 needs_authorization:=c.plan_id in ('fiscal','fiscal_ie');
 if needs_authorization and not exists (
  select 1 from public.fiscal_private_documents d
   join storage.objects f on f.bucket_id='fiscal-private' and f.name=d.file_path
   where d.contract_id=c.id and d.category='authorization'
     and d.file_path ~* '[.]pdf$'
 ) then raise exception 'Anexe a declaração de autorização assinada em PDF.'; end if;

 update public.fiscal_private_documents
  set verified=true,
      publicly_verifiable=(category='authorization' and needs_authorization)
  where contract_id=c.id and category in ('contract','authorization')
    and file_path ~* '[.]pdf$'
    and exists(select 1 from storage.objects so where so.name=file_path and so.bucket_id='fiscal-private');
 update public.fiscal_contracts set
  status='ativo',start_date=current_date,
  renewal_date=(current_date+make_interval(months=>c.term_months))::date,
  formalized_at=now(),formalized_by=(select auth.uid()),
  formalization_notes=left(coalesce(p_notes,''),2000)
 where id=c.id;
 return jsonb_build_object('active',true,'contractId',c.id);
end;
$$;
revoke all on function public.mva_finalize_fiscal_contract(uuid,boolean,text) from public,anon;
grant execute on function public.mva_finalize_fiscal_contract(uuid,boolean,text) to authenticated;

-- Customers cannot see unapproved documents or access their file bytes.
drop policy if exists fiscal_docs_read on public.fiscal_private_documents;
create policy fiscal_docs_read on public.fiscal_private_documents
 for select to authenticated
 using (
  (select public.is_admin())
  or (
   request_id is not null and exists(
    select 1 from public.fiscal_applications a
    where a.id=request_id and a.user_id=(select auth.uid())
   )
  )
  or (
   contract_id is not null and verified=true and category in('contract','authorization')
   and exists(
    select 1 from public.fiscal_contracts c
    where c.id=contract_id and c.user_id=(select auth.uid())
      and c.status='ativo' and c.payment_status='paid'
      and c.payment_is_live=true and c.renewal_date>=current_date
   )
  )
 );

drop policy if exists fiscal_private_read on storage.objects;
create policy fiscal_private_read on storage.objects
 for select to authenticated
 using (
  bucket_id='fiscal-private'
  and (
   (select public.is_admin())
   or (
    split_part(name,'/',1)='requests' and exists (
     select 1 from public.fiscal_applications a
      where a.id::text=split_part(storage.objects.name,'/',2)
        and a.user_id=(select auth.uid())
    )
   )
   or (
    split_part(name,'/',1)='contracts'
    and exists (
     select 1 from public.fiscal_private_documents d
      join public.fiscal_contracts c on c.id=d.contract_id
      where d.file_path=storage.objects.name
       and d.verified=true and d.category in('contract','authorization')
       and c.user_id=(select auth.uid())
       and c.status='ativo' and c.payment_status='paid'
       and c.payment_is_live=true and c.renewal_date>=current_date
    )
   )
  )
 );
commit;