-- Executa automaticamente o worker de e-mail e Google Agenda, sem credenciais no GitHub.
-- Dependências: pg_net e pg_cron. Chave interna gerada na tabela protegida.
begin;
create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.dispatch_mva_booking_deliveries()
returns void language plpgsql security definer set search_path = '' as $$
declare
  secret text;
begin
  select webhook_secret into secret from public.booking_delivery_config where id=1;
  if secret is null then return; end if;
  perform net.http_post(
    url := 'https://yealdaokedpfpdgvslzj.supabase.co/functions/v1/mva-booking-deliveries',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','x-mva-delivery-key', secret),
    timeout_milliseconds := 5000
  );
end;
$$;
revoke all on function public.dispatch_mva_booking_deliveries() from public, anon, authenticated;

select cron.schedule(
  'mva-booking-deliveries-worker',
  '* * * * *',
  'select public.dispatch_mva_booking_deliveries();'
);
commit;
