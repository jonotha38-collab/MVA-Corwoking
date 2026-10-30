-- Real encrypted-at-rest private correspondence PDFs; no fake "download complete" flows.
begin;
create or replace function public.enforce_correspondence_scan_path()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='digitalizado' and (
  new.digitalized_doc_url is null
  or new.digitalized_doc_url !~ ('^contracts/'||new.company_id::text||'/[0-9a-f-]{36}[.]pdf$')
 ) then
  raise exception 'Documento digitalizado precisa ter PDF privado associado.' using errcode='23514';
 end if;
 if new.digitalized_doc_url is distinct from old.digitalized_doc_url and new.digitalized_doc_url is not null then
  if new.digitalized_doc_url !~ ('^contracts/'||new.company_id::text||'/[0-9a-f-]{36}[.]pdf$') then
   raise exception 'Caminho do PDF inválido.' using errcode='23514';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists enforce_correspondence_scan_path_trg on public.correspondence;
create trigger enforce_correspondence_scan_path_trg before update on public.correspondence
for each row execute function public.enforce_correspondence_scan_path();
revoke execute on function public.enforce_correspondence_scan_path() from public,anon,authenticated;
commit;