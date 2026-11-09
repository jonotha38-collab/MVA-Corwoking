-- Hide fiscal partner units whenever their marketplace spaces are paused or unapproved.
begin;
drop policy if exists fiscal_units_public on public.fiscal_units;
create policy fiscal_units_public on public.fiscal_units for select to anon, authenticated
using (
 active=true and approved_at is not null and (
  space_id is null or exists(
    select 1 from public.spaces s
    where s.id=space_id and s.approval='aprovado' and s.status='available'
  )
 )
);
commit;