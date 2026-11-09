-- MVA Coworking: intake de pessoa física e jurídica + documentos privados.
-- Mantém registros antigos ("legacy") sem modificar seus dados.
alter table public.fiscal_applications
  add column if not exists applicant_type text not null default 'legacy',
  add column if not exists intake_details jsonb not null default '{}'::jsonb;

alter table public.fiscal_private_documents
  add column if not exists document_kind text,
  add column if not exists signer_index integer;

do $$
begin
 if not exists(select 1 from pg_constraint where conname='fiscal_applicant_type_check' and conrelid='public.fiscal_applications'::regclass) then
  alter table public.fiscal_applications add constraint fiscal_applicant_type_check
   check(applicant_type in ('legacy','pf','pj'));
 end if;
 if not exists(select 1 from pg_constraint where conname='fiscal_intake_details_object' and conrelid='public.fiscal_applications'::regclass) then
  alter table public.fiscal_applications add constraint fiscal_intake_details_object
   check(jsonb_typeof(intake_details)='object');
 end if;
 if not exists(select 1 from pg_constraint where conname='fiscal_document_kind_check' and conrelid='public.fiscal_private_documents'::regclass) then
  alter table public.fiscal_private_documents add constraint fiscal_document_kind_check
   check(document_kind is null or document_kind in
    ('partner_rg','partner_cpf','partner_address','social_contract','contract_amendments'));
 end if;
 if not exists(select 1 from pg_constraint where conname='fiscal_document_signer_index_check' and conrelid='public.fiscal_private_documents'::regclass) then
  alter table public.fiscal_private_documents add constraint fiscal_document_signer_index_check
   check((document_kind is null) or (
    document_kind in ('partner_rg','partner_cpf','partner_address') and signer_index between 0 and 19
   ) or (document_kind in ('social_contract','contract_amendments') and signer_index is null));
 end if;
end $$;

create index if not exists fiscal_private_document_kind_idx
 on public.fiscal_private_documents(request_id,document_kind,signer_index);

-- A função roda apenas como gatilho. A identidade, aprovação e consentimento
-- continuam sujeitos às políticas RLS e aos gatilhos existentes.
create or replace function public.mva_validate_fiscal_intake_on_approval()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare
 d jsonb;
 p jsonb;
 i integer;
 required_key text;
 partner_kind text;
begin
 if new.status is distinct from 'approved' or old.status='approved' then return new; end if;
 if new.applicant_type='legacy' then return new; end if;
 d:=new.intake_details;
 if jsonb_typeof(d)<>'object' then
  raise exception 'Dados cadastrais incompletos.' using errcode='23514';
 end if;
 if new.applicant_type='pf' then
  foreach required_key in array array['full_name','rg','cpf','address','cep','profession','marital_status','birth_date','phone','email','activity']
  loop
   if length(btrim(coalesce(d->>required_key,'')))<2 then
    raise exception 'Dados obrigatórios da pessoa física incompletos: %.',required_key using errcode='23514';
   end if;
  end loop;
 elsif new.applicant_type='pj' then
  foreach required_key in array array['company_name','cnpj','activity','accountant_name','accountant_phone','accountant_crc','phone','email']
  loop
   if length(btrim(coalesce(d->>required_key,'')))<2 then
    raise exception 'Dados obrigatórios da pessoa jurídica incompletos: %.',required_key using errcode='23514';
   end if;
  end loop;
  if jsonb_typeof(d->'signers')<>'array' or jsonb_array_length(d->'signers') not between 1 and 20 then
   raise exception 'Informe todos os sócios que assinam pela empresa.' using errcode='23514';
  end if;
  for i in 0..jsonb_array_length(d->'signers')-1 loop
   p:=d->'signers'->i;
   foreach required_key in array array['name','rg','cpf','address','cep','activity'] loop
    if length(btrim(coalesce(p->>required_key,'')))<2 then
     raise exception 'Dados incompletos do sócio %: %.',i+1,required_key using errcode='23514';
    end if;
   end loop;
   foreach partner_kind in array array['partner_rg','partner_cpf','partner_address'] loop
    if not exists(
     select 1 from public.fiscal_private_documents f
      inner join storage.objects o on o.bucket_id='fiscal-private' and o.name=f.file_path
     where f.request_id=new.id and f.document_kind=partner_kind and f.signer_index=i
    ) then
     raise exception 'Anexe RG, CPF e comprovante de endereço de cada sócio.' using errcode='23514';
    end if;
   end loop;
  end loop;
  if not exists(
   select 1 from public.fiscal_private_documents f
    inner join storage.objects o on o.bucket_id='fiscal-private' and o.name=f.file_path
   where f.request_id=new.id and f.document_kind='social_contract'
  ) then
   raise exception 'O contrato social é obrigatório antes da aprovação.' using errcode='23514';
  end if;
  if (d->>'has_amendments')='true' and not exists(
   select 1 from public.fiscal_private_documents f
    inner join storage.objects o on o.bucket_id='fiscal-private' and o.name=f.file_path
   where f.request_id=new.id and f.document_kind='contract_amendments'
  ) then
   raise exception 'Anexe as alterações contratuais informadas.' using errcode='23514';
  end if;
 else
  raise exception 'Tipo de contratante inválido.' using errcode='23514';
 end if;
 return new;
end;
$$;

revoke all on function public.mva_validate_fiscal_intake_on_approval() from public, anon, authenticated;
drop trigger if exists mva_validate_fiscal_intake_approval on public.fiscal_applications;
create trigger mva_validate_fiscal_intake_approval
 before update of status on public.fiscal_applications
 for each row
 when (new.status='approved' and old.status is distinct from new.status)
 execute function public.mva_validate_fiscal_intake_on_approval();

comment on column public.fiscal_applications.intake_details is
 'Dados pessoais e societários de análise de endereço: acesso restrito via RLS ao titular e administradores.';
comment on column public.fiscal_private_documents.document_kind is
 'Natureza do documento de onboarding (o arquivo está no bucket privado fiscal-private).';
