begin;
alter table public.bookings
 add column if not exists fiscal_bonus_hours numeric(6,2) not null default 0,
 add column if not exists fiscal_bonus_cycle date,
 add column if not exists fiscal_discount_percent smallint not null default 0,
 add column if not exists fiscal_benefit_contract_id uuid references public.fiscal_contracts(id);

alter table public.bookings
 drop constraint if exists bookings_fiscal_bonus_hours_check,
 add constraint bookings_fiscal_bonus_hours_check check(fiscal_bonus_hours>=0 and fiscal_bonus_hours<=duration_hours),
 drop constraint if exists bookings_fiscal_discount_check,
 add constraint bookings_fiscal_discount_check check(fiscal_discount_percent between 0 and 50),
 drop constraint if exists bookings_fiscal_bonus_cycle_check,
 add constraint bookings_fiscal_bonus_cycle_check check((fiscal_bonus_hours=0 and fiscal_bonus_cycle is null) or (fiscal_bonus_hours>0 and fiscal_bonus_cycle is not null));

create index if not exists bookings_fiscal_bonus_usage_idx
 on public.bookings(user_id,fiscal_bonus_cycle,status)
 where fiscal_bonus_hours>0;

-- This trigger runs AFTER the existing secure_booking_insert trigger (alphabetical
-- ordering) and cannot accept a customer-supplied discount, balance, or plan.
create or replace function public.zz_mva_apply_fiscal_room_benefit()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_room public.spaces%rowtype;
 v_contract uuid;
 v_plan text;
 v_discount integer:=0;
 v_bonus_limit numeric:=0;
 v_bonus_months integer:=0;
 v_first_start date;
 v_cycle_start date;
 v_used numeric:=0;
 v_bonus numeric:=0;
 v_addons numeric:=0;
 v_month integer;
 v_now date:=(now() at time zone 'America/Maceio')::date;
begin
 new.fiscal_bonus_hours:=0;
 new.fiscal_bonus_cycle:=null;
 new.fiscal_discount_percent:=0;
 new.fiscal_benefit_contract_id:=null;

 select * into v_room from public.spaces where id=new.space_id and is_mva_headquarters=true;
 if not found or new.status<>'confirmada' then return new; end if;

 -- Serializes every benefit claim for the same account: non-accumulative quotas
 -- cannot be redeemed twice by two concurrent room reservations.
 perform 1 from public.profiles where id=new.user_id for update;
 if not found then return new; end if;

 select c.id,c.plan_id,p.room_discount_percent,p.bonus_hours_per_month,p.bonus_months
 into v_contract,v_plan,v_discount,v_bonus_limit,v_bonus_months
 from public.fiscal_contracts c
 join public.mva_fiscal_prices p on p.id=c.plan_id
 where c.user_id=new.user_id
   and c.plan_id in ('mva_essencial','mva_profissional','mva_excellence')
   and c.status='ativo' and c.payment_status='paid' and c.payment_is_live=true
   and c.start_date<=v_now and c.renewal_date>=v_now
   and new.booking_date between c.start_date and c.renewal_date
 order by p.room_discount_percent desc,c.start_date desc
 limit 1;
 if v_contract is null then return new; end if;

 new.fiscal_benefit_contract_id:=v_contract;
 new.fiscal_discount_percent:=v_discount;

 if v_plan='mva_excellence' and v_bonus_limit>0 and
    v_room.category='atendimento' and v_room.capacity<=3 then
   select min(c.start_date) into v_first_start
   from public.fiscal_contracts c
   where c.user_id=new.user_id and c.plan_id='mva_excellence'
     and c.formalized_at is not null;

   if v_first_start is not null then
    for v_month in 0..least(v_bonus_months,3)-1 loop
     v_cycle_start:=(v_first_start+make_interval(months=>v_month))::date;
     if new.booking_date>=v_cycle_start
        and new.booking_date<(v_first_start+make_interval(months=>v_month+1))::date then
       select coalesce(sum(b.fiscal_bonus_hours),0) into v_used
       from public.bookings b
       where b.user_id=new.user_id and b.fiscal_bonus_cycle=v_cycle_start
         and b.status<>'cancelada';
       v_bonus:=least(new.duration_hours,greatest(0,v_bonus_limit-v_used));
       if v_bonus>0 then
        new.fiscal_bonus_cycle:=v_cycle_start;
        new.fiscal_bonus_hours:=v_bonus;
       end if;
       exit;
     end if;
    end loop;
   end if;
 end if;

 v_addons:=case when coalesce(array_length(new.addons,1),0)>0 then 60 else 0 end;
 new.total_price:=round(
   greatest(0,new.duration_hours-v_bonus)*v_room.price_per_hour*(100-v_discount)/100
   +v_addons,2
 );
 return new;
end;
$$;
revoke all on function public.zz_mva_apply_fiscal_room_benefit() from public,anon,authenticated;
drop trigger if exists zz_mva_apply_fiscal_room_benefit on public.bookings;
create trigger zz_mva_apply_fiscal_room_benefit
 before insert on public.bookings
 for each row execute function public.zz_mva_apply_fiscal_room_benefit();

-- The already existing secure_booking_update rejects changes to any non-status
-- booking field, including the new benefit fields.
comment on column public.bookings.fiscal_bonus_hours is
 'Hours actually allocated by server to an MVA Excellence reservation. Canceled bookings no longer consume monthly quota.';
comment on column public.bookings.fiscal_bonus_cycle is
 'Start date of a non-cumulative contract-month within the first three Excellence months.';
commit;