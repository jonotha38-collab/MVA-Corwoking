-- MVA fiscal service workflow (non-destructive). Existing paid contracts remain unchanged.
begin;

create table if not exists public.fiscal_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 company_name text not null check (length(btrim(company_name)) between 3 and 180),
 trading_name text not null default '',
 cnpj text not null check (length(btrim(cnpj)) between 3 and 30),
 cnae text not null check (length(btrim(cnae)) between 3 and 120),
 responsible_name text not null check (length(btrim(responsible_name)) between 3 and 160),
 contact_email text not null check (length(btrim(contact_email)) between 5 and 254),
 contact_phone text not null default '',
 plan_id text not null check (plan_id in ('comercial','fiscal','fiscal_ie')),
 term_months smallint not null check (term_months in (1,12)),
 transfer_from text not null default '',
 unit_id uuid,
 terms_version text not null check (terms_version = '2026-10-30'),
 terms_accepted_at timestamptz not null default now(),
 status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected')),
 review_notes text not null default '',
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.fiscal_provider_requests (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 space_id uuid not null references public.spaces(id) on delete restrict,
 details text not null check (length(btrim(details)) between 15 and 1500),
 status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
 admin_notes text not null default '',
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 unique (space_id)
);

-- Only approved providers can be selected; the MVA headquarters is available for review.
create table if not exists public.fiscal_units (
 id uuid primary key default gen_random_uuid(),
 space_id uuid unique references public.spaces(id) on delete restrict,
 operator_id uuid references auth.users(id) on delete restrict,
 name text not null check(length(btrim(name)) between 3 and 150),
 street_address text not null check(length(btrim(street_address)) between 5 and 300),
 city text not null,
 state text not null,
 active boolean not null default false,
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.fiscal_applications add constraint fiscal_applications_unit_fk foreign key(unit_id) references public.fiscal_units(id);

-- Private records. No documents are publicly downloadable.
create table if not exists public.fiscal_private_documents (
 id uuid primary key default gen_random_uuid(),
 request_id uuid references public.fiscal_applications(id) on delete restrict,
 contract_id uuid references public.fiscal_contracts(id) on delete restrict,
 uploader_id uuid not null references auth.users(id) on delete restrict,
 file_path text not null unique,
 file_name text not null check(length(btrim(file_name)) between 3 and 180),
 category text not null check(category in ('registration','proof','contract','authorization','receipt','other')),
 verified boolean not null default false,
 publicly_verifiable boolean not null default false,
 verification_code uuid not null default gen_random_uuid() unique,
 created_at timestamptz not null default now(),
 constraint fiscal_document_parent_check check ((request_id is not null) <> (contract_id is not null))
);
create index if not exists fiscal_applications_user_idx on public.fiscal_applications(user_id, created_at desc);
create index if not exists fiscal_private_documents_request_idx on public.fiscal_private_documents(request_id);
create index if not exists fiscal_private_documents_contract_idx on public.fiscal_private_documents(contract_id);
create index if not exists fiscal_provider_requests_owner_idx on public.fiscal_provider_requests(owner_id);

-- All privileged status changes are controlled server-side. Clients cannot approve themselves.
create or replace function public.enforce_fiscal_application_integrity()
returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op='INSERT' then
   if (select auth.uid()) is not null and not public.is_admin() then
     if new.user_id is distinct from (select auth.uid())
       or new.status <> 'submitted' or new.reviewed_by is not null or btrim(new.review_notes) <> '' then
       raise exception 'Não é possível aprovar a própria solicitação.' using errcode='42501';
     end if;
   end if;
 elsif tg_op='UPDATE' then
   if (select auth.uid()) is not null and not public.is_admin() then
     raise exception 'A revisão cadastral é exclusiva da administração.' using errcode='42501';
   end if;
   if old.user_id is distinct from new.user_id or old.terms_accepted_at is distinct from new.terms_accepted_at then
     raise exception 'O aceite e titular da solicitação não podem ser alterados.' using errcode='42501';
   end if;
   new.updated_at := now();
   if new.status is distinct from old.status then
     new.reviewed_at := now();
     new.reviewed_by := (select auth.uid());
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists fiscal_application_integrity on public.fiscal_applications;
create trigger fiscal_application_integrity before insert or update on public.fiscal_applications
for each row execute function public.enforce_fiscal_application_integrity();

create or replace function public.enforce_fiscal_doc_integrity()
returns trigger language plpgsql set search_path = '' as $$
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
   else
     raise exception 'A gestão de documentos é exclusiva da administração.' using errcode='42501';
   end if;
 end if;
 if new.request_id is not null then
   if new.file_path !~ ('^requests/' || new.request_id::text || '/[0-9a-f-]{36}\\.(pdf|png|jpg|jpeg)$') then
     raise exception 'Caminho do documento inválido.' using errcode='22023';
   end if;
 elsif new.contract_id is not null then
   if new.file_path !~ ('^contracts/' || new.contract_id::text || '/[0-9a-f-]{36}\\.(pdf|png|jpg|jpeg)$') then
     raise exception 'Caminho do contrato inválido.' using errcode='22023';
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists fiscal_doc_integrity on public.fiscal_private_documents;
create trigger fiscal_doc_integrity before insert or update on public.fiscal_private_documents
for each row execute function public.enforce_fiscal_doc_integrity();

create or replace function public.enforce_fiscal_provider_integrity()
returns trigger language plpgsql set search_path = '' as $$
begin
 if (select auth.uid()) is not null and not public.is_admin() then
   if tg_op<>'INSERT' then raise exception 'Somente a MVA pode aprovar unidades.' using errcode='42501'; end if;
   if new.owner_id is distinct from (select auth.uid()) or new.status<>'submitted'
     or not exists(select 1 from public.spaces s where s.id=new.space_id and s.owner_id=(select auth.uid()) and s.is_mva_headquarters=false)
     then raise exception 'Solicitação de unidade não autorizada.' using errcode='42501'; end if;
 end if;
 return new;
end;
$$;
drop trigger if exists fiscal_provider_integrity on public.fiscal_provider_requests;
create trigger fiscal_provider_integrity before insert or update on public.fiscal_provider_requests
for each row execute function public.enforce_fiscal_provider_integrity();

alter table public.fiscal_applications enable row level security;
alter table public.fiscal_provider_requests enable row level security;
alter table public.fiscal_units enable row level security;
alter table public.fiscal_private_documents enable row level security;

create policy fiscal_application_read on public.fiscal_applications for select to authenticated
using(user_id=(select auth.uid()) or (select public.is_admin()));
create policy fiscal_application_submit on public.fiscal_applications for insert to authenticated
with check(user_id=(select auth.uid()) and status='submitted' and reviewed_by is null and review_notes='');
create policy fiscal_application_admin_update on public.fiscal_applications for update to authenticated
using((select public.is_admin())) with check((select public.is_admin()));

create policy fiscal_provider_read on public.fiscal_provider_requests for select to authenticated
using(owner_id=(select auth.uid()) or (select public.is_admin()));
create policy fiscal_provider_insert on public.fiscal_provider_requests for insert to authenticated
with check(owner_id=(select auth.uid()) and status='submitted'
 and exists(select 1 from public.spaces s where s.id=space_id and s.owner_id=(select auth.uid()) and not s.is_mva_headquarters));
create policy fiscal_provider_admin_update on public.fiscal_provider_requests for update to authenticated
using((select public.is_admin())) with check((select public.is_admin()));

create policy fiscal_units_public on public.fiscal_units for select to anon,authenticated
using(active=true and approved_at is not null);
create policy fiscal_units_admin_read on public.fiscal_units for select to authenticated
using((select public.is_admin()) or operator_id=(select auth.uid()));
create policy fiscal_units_admin_insert on public.fiscal_units for insert to authenticated
with check((select public.is_admin()));
create policy fiscal_units_admin_update on public.fiscal_units for update to authenticated
using((select public.is_admin())) with check((select public.is_admin()));

create policy fiscal_docs_read on public.fiscal_private_documents for select to authenticated
using((select public.is_admin()) or
 (request_id is not null and exists(select 1 from public.fiscal_applications a
  where a.id=request_id and a.user_id=(select auth.uid())))
 or (contract_id is not null and exists(select 1 from public.fiscal_contracts f
  where f.id=contract_id and f.user_id=(select auth.uid()))));
create policy fiscal_docs_client_add on public.fiscal_private_documents for insert to authenticated
with check(uploader_id=(select auth.uid()) and category in ('registration','proof','other')
 and not verified and not publicly_verifiable and contract_id is null
 and exists(select 1 from public.fiscal_applications a
  where a.id=request_id and a.user_id=(select auth.uid()) and a.status in ('submitted','under_review')));
create policy fiscal_docs_admin_add on public.fiscal_private_documents for insert to authenticated
with check((select public.is_admin()));
create policy fiscal_docs_admin_update on public.fiscal_private_documents for update to authenticated
using((select public.is_admin())) with check((select public.is_admin()));

grant select,insert,update on public.fiscal_applications,public.fiscal_provider_requests,
 public.fiscal_units,public.fiscal_private_documents to authenticated;
grant select on public.fiscal_units to anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fiscal-private','fiscal-private',false,10485760,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=10485760,
allowed_mime_types=array['application/pdf','image/png','image/jpeg'];

create policy fiscal_private_read on storage.objects for select to authenticated
using(bucket_id='fiscal-private' and (
 (select public.is_admin())
 or (split_part(name,'/',1)='requests' and exists (
   select 1 from public.fiscal_applications a
   where a.id::text=split_part(name,'/',2) and a.user_id=(select auth.uid())))
 or (split_part(name,'/',1)='contracts' and exists(
   select 1 from public.fiscal_contracts f
   where f.id::text=split_part(name,'/',2) and f.user_id=(select auth.uid())))
));
create policy fiscal_private_insert on storage.objects for insert to authenticated
with check(bucket_id='fiscal-private' and (
 (select public.is_admin())
 or (split_part(name,'/',1)='requests' and
    name ~ '^requests/[0-9a-f-]{36}/[0-9a-f-]{36}\\.(pdf|png|jpg|jpeg)$'
    and exists (select 1 from public.fiscal_applications a
       where a.id::text=split_part(name,'/',2) and a.user_id=(select auth.uid())
       and a.status in ('submitted','under_review')))
));
create policy fiscal_private_delete on storage.objects for delete to authenticated
using(bucket_id='fiscal-private' and (select public.is_admin()));

-- Public authenticity check exposes no name, document bytes or contract number.
create or replace function public.verify_fiscal_document(p_code uuid)
returns table(authentic boolean, status text)
language plpgsql stable security definer set search_path = '' as $$
begin
 return query
 select
 coalesce(exists(
   select 1 from public.fiscal_private_documents d
   join public.fiscal_contracts c on c.id=d.contract_id
   where d.verification_code=p_code and d.publicly_verifiable and d.verified
     and d.category='authorization' and c.status='ativo' and c.payment_status='paid'
     and c.payment_is_live=true and c.renewal_date >= current_date
 ),false),
 case when exists(
   select 1 from public.fiscal_private_documents d
   join public.fiscal_contracts c on c.id=d.contract_id
   where d.verification_code=p_code and d.publicly_verifiable and d.verified
     and d.category='authorization' and c.status='ativo' and c.payment_status='paid'
     and c.payment_is_live=true and c.renewal_date >= current_date
 ) then 'valid' else 'not_verified' end;
end;
$$;
revoke execute on function public.verify_fiscal_document(uuid) from public;
grant execute on function public.verify_fiscal_document(uuid) to anon,authenticated;
revoke execute on function public.enforce_fiscal_application_integrity(),public.enforce_fiscal_doc_integrity(),public.enforce_fiscal_provider_integrity() from public,anon,authenticated;

commit;