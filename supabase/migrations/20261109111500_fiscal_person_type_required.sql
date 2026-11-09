-- Nova versão do aceite e proteção contra inclusão de pedidos sem identificação PF/PJ.
alter table public.fiscal_applications drop constraint if exists fiscal_applications_terms_version_check;
alter table public.fiscal_applications add constraint fiscal_applications_terms_version_check
 check(terms_version in ('2026-10-30','2026-11-09'));

create or replace function public.mva_require_typed_fiscal_intake()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (select auth.uid()) is not null and not public.is_admin() and new.applicant_type='legacy' then
  raise exception 'Selecione Pessoa Física ou Jurídica no novo formulário.' using errcode='23514';
 end if;
 if new.applicant_type='pf' and btrim(lower(new.cnpj))<>'em abertura' then
  raise exception 'O cadastro de Pessoa Física não pode substituir documentos de uma Pessoa Jurídica.' using errcode='23514';
 end if;
 if new.applicant_type='pj' and btrim(lower(new.cnpj))='em abertura' then
  raise exception 'O CNPJ é obrigatório para a Pessoa Jurídica.' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.mva_require_typed_fiscal_intake() from public,anon,authenticated;
drop trigger if exists mva_require_typed_fiscal_intake on public.fiscal_applications;
create trigger mva_require_typed_fiscal_intake
 before insert on public.fiscal_applications for each row
 execute function public.mva_require_typed_fiscal_intake();
