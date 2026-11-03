-- Fix SECURITY DEFINER permission semantics: execution is already granted only to service_role.
-- Avoid ambiguous PL/pgSQL variable names in subscription events.
begin;
do $$
declare definition text;
begin
 definition := pg_get_functiondef('public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean)'::regprocedure);
 definition := replace(definition,
  E' if current_user <> \'service_role\' then\n  raise exception \'Only service_role may process Stripe webhooks\' using errcode=\'42501\';\n end if;\n',
  E' -- Execution is limited via REVOKE/GRANT to service_role.\n');
 definition := replace(definition,' owner_id uuid;',' v_owner_id uuid;');
 definition := replace(definition,'begin owner_id:=','begin v_owner_id:=');
 definition := replace(definition,'then owner_id:=null;','then v_owner_id:=null;');
 definition := replace(definition,'if owner_id is not null','if v_owner_id is not null');
 definition := replace(definition,'where owner_id=owner_id','where owner_id=v_owner_id');
 if definition like '%current_user <>%' or definition like '%where owner_id=owner_id%'
     or definition like '% owner_id uuid;%' then
   raise exception 'Failed to patch Stripe webhook definition safely';
 end if;
 execute definition;
end $$;
revoke all on function public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean)
 from public,anon,authenticated;
grant execute on function public.mva_apply_verified_stripe_event(text,text,jsonb,text,boolean) to service_role;
commit;