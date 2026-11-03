-- Owner plan enforcement is prepared but OFF until Stripe production billing is tested.
-- Existing listings remain unaffected while mva_billing_settings.enforce_owner_subscriptions=false.
begin;
create or replace function public.mva_can_publish_owner_space(p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select not coalesce((select enforce_owner_subscriptions from public.mva_billing_settings where id=1),false)
 or exists (
  select 1 from public.mva_owner_subscriptions s
  where s.owner_id=p_owner and s.status in('active','trialing')
    and s.livemode=true and s.current_period_end>now()
 );
$$;
revoke all on function public.mva_can_publish_owner_space(uuid) from public;
grant execute on function public.mva_can_publish_owner_space(uuid) to anon,authenticated,service_role;

drop policy if exists spaces_public_select on public.spaces;
create policy spaces_public_select on public.spaces for select to anon,authenticated
using (
 approval='aprovado' and status='available' and
 (is_mva_headquarters=true or owner_id is null or public.mva_can_publish_owner_space(owner_id))
);

create or replace function public.mva_validate_owner_approval_limit()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_limit integer; v_used integer; v_owner uuid;
begin
 if new.is_mva_headquarters or new.owner_id is null or
  not coalesce((select enforce_owner_subscriptions from public.mva_billing_settings where id=1),false)
 then return new; end if;
 v_owner:=new.owner_id;
 if new.approval='aprovado' and
     (tg_op='INSERT' or old.approval is distinct from 'aprovado') then
   if not public.mva_can_publish_owner_space(v_owner) then
     raise exception 'O parceiro precisa ter uma assinatura Stripe ativa e vigente.' using errcode='23514';
   end if;
   select p.max_spaces into v_limit
   from public.mva_owner_subscriptions s join public.mva_owner_plans p on p.id=s.plan_id
   where s.owner_id=v_owner and s.status in('active','trialing') and s.livemode=true
     and s.current_period_end>now();
   select count(*) into v_used from public.spaces
    where owner_id=v_owner and approval='aprovado' and id is distinct from new.id;
   if v_limit is null or v_used>=v_limit then
     raise exception 'Limite de espaços do plano atingido.' using errcode='23514';
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists mva_validate_owner_approval_limit_trg on public.spaces;
create trigger mva_validate_owner_approval_limit_trg
 before insert or update of approval on public.spaces
 for each row execute function public.mva_validate_owner_approval_limit();
revoke all on function public.mva_validate_owner_approval_limit() from public,anon,authenticated;

commit;