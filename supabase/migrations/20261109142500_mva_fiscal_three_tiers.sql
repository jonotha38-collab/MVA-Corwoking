begin;
-- Keep legacy plans/amounts intact for already approved requests and pending sessions.
alter table public.mva_fiscal_prices drop constraint if exists mva_fiscal_prices_id_check;
alter table public.mva_fiscal_prices add constraint mva_fiscal_prices_id_check
 check(id in ('comercial','fiscal','fiscal_ie','mva_essencial','mva_profissional','mva_excellence'));
alter table public.fiscal_applications drop constraint if exists fiscal_applications_plan_id_check;
alter table public.fiscal_applications add constraint fiscal_applications_plan_id_check
 check(plan_id in ('comercial','fiscal','fiscal_ie','mva_essencial','mva_profissional','mva_excellence'));

alter table public.mva_fiscal_prices
 add column if not exists annual_discount_percent integer not null default 0
 check(annual_discount_percent between 0 and 50),
 add column if not exists room_discount_percent integer not null default 0
 check(room_discount_percent between 0 and 50),
 add column if not exists bonus_hours_per_month numeric(5,2) not null default 0
 check(bonus_hours_per_month between 0 and 16),
 add column if not exists bonus_months integer not null default 0
 check(bonus_months between 0 and 12);

insert into public.mva_fiscal_prices
 (id,name,monthly_cents,annual_discount_percent,room_discount_percent,bonus_hours_per_month,bonus_months,active)
 values
 ('mva_essencial','MVA Essencial',7990,10,5,0,0,true),
 ('mva_profissional','MVA Profissional',9190,10,10,0,0,true),
 ('mva_excellence','MVA Excellence',10300,10,15,2,3,true)
on conflict(id) do update set
 name=excluded.name,monthly_cents=excluded.monthly_cents,
 annual_discount_percent=excluded.annual_discount_percent,
 room_discount_percent=excluded.room_discount_percent,
 bonus_hours_per_month=excluded.bonus_hours_per_month,
 bonus_months=excluded.bonus_months,active=true,updated_at=now();

-- All new plans are fiscal addresses, requiring a signed authorization document.
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

 needs_authorization:=c.plan_id in ('fiscal','fiscal_ie','mva_essencial','mva_profissional','mva_excellence');
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
commit;