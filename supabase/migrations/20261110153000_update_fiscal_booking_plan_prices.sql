-- 2026-11-10: independent price updates for fiscal address and room-hour memberships.
-- Fiscal MVA Essencial/Profissional/Excellence: R$85 / R$95 / R$110 per month.
-- Room hours: Bronze (4h x R$45)=R$180, Prata (8h x R$40)=R$320,
--             Ouro (12h x R$35)=R$420 per month.
-- No existing payment orders, signed contracts or subscription objects are altered.
begin;
do $preflight$
begin
 if (select count(*) from public.mva_fiscal_prices
     where id in('mva_essencial','mva_profissional','mva_excellence'))<>3 then
   raise exception 'Fiscal plan catalog incomplete. No prices updated.';
 end if;
 if (select count(*) from public.mva_booking_plans
     where (id='bronze' and included_minutes=240)
        or (id='prata' and included_minutes=480)
        or (id='ouro' and included_minutes=720))<>3 then
   raise exception 'Booking hour quotas changed. No prices updated.';
 end if;
end $preflight$;
update public.mva_fiscal_prices
set monthly_cents=case id
  when 'mva_essencial' then 8500
  when 'mva_profissional' then 9500
  when 'mva_excellence' then 11000
end,updated_at=now()
where id in('mva_essencial','mva_profissional','mva_excellence');
update public.mva_booking_plans set
 monthly_cents=case id
   when 'bronze' then 18000
   when 'prata' then 32000
   when 'ouro' then 42000
 end,
 stripe_live_price_id=case id
   when 'bronze' then 'price_1UaDzH31eJ9Ivl6iQ2XDvyeP'
   when 'prata' then 'price_1UaDzL31eJ9Ivl6iuxewsHXz'
   when 'ouro' then 'price_1UaDzP31eJ9Ivl6iWXxjP6WI'
 end
where id in ('bronze','prata','ouro');
commit;