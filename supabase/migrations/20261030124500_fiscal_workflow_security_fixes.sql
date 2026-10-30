-- Complements the workflow without activating payments or issuing any declarations.
begin;
alter table public.fiscal_contracts add column if not exists plan_id text;
alter table public.fiscal_contracts add column if not exists term_months smallint not null default 12 check(term_months in(1,12));
alter table public.fiscal_contracts add column if not exists payment_status text not null default 'unpaid' check(payment_status in('unpaid','paid','refunded','disputed'));
alter table public.fiscal_contracts add column if not exists payment_is_live boolean not null default false;
alter table public.fiscal_contracts add column if not exists payment_order_id uuid unique;
alter table public.fiscal_contracts add column if not exists certificate_number text unique;

insert into public.fiscal_units(name,street_address,city,state,active,approved_at)
select 'MVA Coworking — Sede','Rua Dom José Thomaz, 565 - São José, Aracaju - SE, CEP 49015-090','Aracaju','SE',true,now()
where not exists(select 1 from public.fiscal_units where name='MVA Coworking — Sede');

create or replace function public.enforce_fiscal_application_integrity()
returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
   if (select auth.uid()) is not null and not public.is_admin() then
     if new.user_id is distinct from (select auth.uid()) or new.status <> 'submitted'
       or new.reviewed_by is not null or btrim(new.review_notes) <> ''
       or new.terms_accepted_at < now()-interval '15 minutes'
       or new.terms_accepted_at > now()+interval '2 minutes' then
       raise exception 'Solicitação inválida.' using errcode='42501';
     end if;
   end if;
   if new.unit_id is not null and not exists(
     select 1 from public.fiscal_units u where u.id=new.unit_id and u.active and u.approved_at is not null
   ) then raise exception 'Unidade indisponível para análise.' using errcode='23514'; end if;
 elsif tg_op='UPDATE' then
   if (select auth.uid()) is not null and not public.is_admin() then
     raise exception 'Revisão exclusiva da MVA.' using errcode='42501';
   end if;
   if old.user_id is distinct from new.user_id or old.terms_accepted_at is distinct from new.terms_accepted_at then
     raise exception 'Titular e aceite imutáveis.' using errcode='42501';
   end if;
   new.updated_at:=now();
   if new.status is distinct from old.status then
      new.reviewed_at:=now(); new.reviewed_by:=(select auth.uid());
   end if;
 end if;
 return new;
end;
$$;

create or replace function public.enforce_fiscal_doc_integrity()
returns trigger language plpgsql set search_path='' as $$
begin
 if (select auth.uid()) is not null and not public.is_admin() then
   if tg_op='INSERT' then
     if new.uploader_id is distinct from (select auth.uid())
       or new.contract_id is not null or new.verified or new.publicly_verifiable
       or new.category not in ('registration','proof','other')
       or not exists(select 1 from public.fiscal_applications a
         where a.id=new.request_id and a.user_id=(select auth.uid())
           and a.status in ('submitted','under_review')) then
       raise exception 'Documento não autorizado.' using errcode='42501';
     end if;
   else raise exception 'Gestão de documentos restrita.' using errcode='42501'; end if;
 end if;
 if new.request_id is not null then
   if new.file_path !~ ('^requests/'||new.request_id::text||'/[0-9a-f-]{36}[.](pdf|png|jpg|jpeg)$')
     then raise exception 'Caminho inválido.' using errcode='22023'; end if;
 else
   if new.file_path !~ ('^contracts/'||new.contract_id::text||'/[0-9a-f-]{36}[.](pdf|png|jpg|jpeg)$')
     then raise exception 'Caminho inválido.' using errcode='22023'; end if;
 end if;
 return new;
end;
$$;

drop policy if exists fiscal_private_insert on storage.objects;
create policy fiscal_private_insert on storage.objects for insert to authenticated
with check(bucket_id='fiscal-private' and (
 (select public.is_admin()) or (
   split_part(name,'/',1)='requests'
   and name ~ '^requests/[0-9a-f-]{36}/[0-9a-f-]{36}[.](pdf|png|jpg|jpeg)$'
   and exists(select 1 from public.fiscal_applications a
      where a.id::text=split_part(name,'/',2) and a.user_id=(select auth.uid())
        and a.status in ('submitted','under_review'))
 )
));

-- Approved partner requests create/select an authorized unit. No auto-approval of legal viability.
create or replace function public.activate_fiscal_partner_unit()
returns trigger language plpgsql security definer set search_path='' as $$
declare s public.spaces%rowtype;
begin
 if new.status='approved' and old.status is distinct from 'approved' then
   select * into s from public.spaces where id=new.space_id;
   if not found or s.approval<>'aprovado' then
     raise exception 'O espaço parceiro precisa estar aprovado no marketplace.' using errcode='23514';
   end if;
   insert into public.fiscal_units(space_id,operator_id,name,street_address,city,state,active,approved_at,approved_by)
   values(s.id,new.owner_id,s.coworking_name||' · '||s.name,s.address,s.city,s.state,true,now(),new.reviewed_by)
   on conflict(space_id) do update set name=excluded.name,street_address=excluded.street_address,
      city=excluded.city,state=excluded.state,active=true,
      approved_at=excluded.approved_at,approved_by=excluded.approved_by;
 end if;
 return new;
end;
$$;
drop trigger if exists activate_fiscal_partner_unit_trg on public.fiscal_provider_requests;
create trigger activate_fiscal_partner_unit_trg after update of status on public.fiscal_provider_requests
for each row execute function public.activate_fiscal_partner_unit();
revoke execute on function public.activate_fiscal_partner_unit() from public,anon,authenticated;

commit;