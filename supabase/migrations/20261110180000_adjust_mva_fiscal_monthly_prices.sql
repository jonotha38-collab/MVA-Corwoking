-- MVA fiscal address: new monthly tariffs for future checkouts only.
-- Historical paid orders and existing contracts remain unchanged.
begin;
do $preflight$
begin
 if (select count(*) from public.mva_fiscal_prices
   where id in ('mva_essencial','mva_profissional','mva_excellence')) <> 3 then
   raise exception 'Expected all three MVA fiscal plans; no price updated';
 end if;
end $preflight$;
update public.mva_fiscal_prices
set monthly_cents=case id
 when 'mva_essencial' then 8990
 when 'mva_profissional' then 9990
 when 'mva_excellence' then 10990
end,
updated_at=now()
where id in ('mva_essencial','mva_profissional','mva_excellence');
commit;