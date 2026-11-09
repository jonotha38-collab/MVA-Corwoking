begin;
create table if not exists public.mva_fiscal_prices (
 id text primary key check(id in('comercial','fiscal','fiscal_ie')),
 name text not null,
 monthly_cents integer not null check(monthly_cents>0),
 active boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.mva_fiscal_prices(id,name,monthly_cents,active)
values('comercial','Endereço Comercial',2990,false),
 ('fiscal','Endereço Fiscal',8000,false),
 ('fiscal_ie','Endereço Fiscal com Inscrição Estadual',12000,false)
on conflict(id) do nothing;
alter table public.mva_fiscal_prices enable row level security;
create policy mva_fiscal_prices_read on public.mva_fiscal_prices for select to anon,authenticated using(true);
grant select on public.mva_fiscal_prices to anon,authenticated;
revoke insert,update,delete on public.mva_fiscal_prices from anon,authenticated;
commit;