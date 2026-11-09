-- Exibe status de entrega no painel administrativo sem expor serviços e segredos.
-- Somente administradores podem consultar; nenhum usuário pode escrever na fila.
begin;
grant select on public.booking_delivery_jobs to authenticated;
drop policy if exists mva_booking_delivery_admin_read on public.booking_delivery_jobs;
create policy mva_booking_delivery_admin_read on public.booking_delivery_jobs
for select to authenticated using ((select public.is_admin()));
commit;
