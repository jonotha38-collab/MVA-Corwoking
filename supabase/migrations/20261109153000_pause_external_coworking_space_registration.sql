-- Temporary pause: only MVA administrators may create or edit coworking room listings.
-- Existing MVA rooms, confirmed bookings, fiscal services and owner subscription history stay intact.
begin;

-- Prevent new partner subscription charges while enrollment is suspended.
update public.mva_billing_settings
set owner_subscriptions_enabled = false
where id = 1;

-- Supabase Data API: deny insert/update for external owners, including
-- callers that bypass the UI using a direct request.
drop policy if exists spaces_insert on public.spaces;
create policy spaces_insert on public.spaces
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists spaces_update on public.spaces;
create policy spaces_update on public.spaces
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Also pause new fiscal-provider accreditation via coworking partnership.
drop policy if exists fiscal_provider_insert on public.fiscal_provider_requests;
create policy fiscal_provider_insert on public.fiscal_provider_requests
  for insert to authenticated
  with check ((select public.is_admin()));

-- Defense in depth for privileged server paths that can bypass RLS:
-- never allow a signed-in non-admin to submit or edit external listings.
create or replace function public.mva_guard_paused_external_listings()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
 if (select auth.uid()) is not null
     and not (select public.is_admin()) then
   raise exception 'O cadastro de espaços externos está temporariamente suspenso pela MVA.'
     using errcode='42501';
 end if;
 return new;
end;
$$;

revoke all on function public.mva_guard_paused_external_listings()
  from public, anon, authenticated;

drop trigger if exists mva_guard_paused_external_listings on public.spaces;
create trigger mva_guard_paused_external_listings
  before insert or update on public.spaces
  for each row execute function public.mva_guard_paused_external_listings();

commit;
