-- MVA Coworking | Security hardening | 2026-10-26
-- Applies without deleting customer records. Keep reviewed migrations in source control.
begin;

-- Public visitors see only approved and available spaces. Owners and MVA can manage hidden ones.
drop policy if exists spaces_select on public.spaces;
drop policy if exists spaces_public_select on public.spaces;
drop policy if exists spaces_owner_admin_select on public.spaces;
create policy spaces_public_select on public.spaces for select to anon, authenticated
  using (approval = 'aprovado' and status = 'available');
create policy spaces_owner_admin_select on public.spaces for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- The browser may never create a paid/active fiscal contract.
-- Authorized internal staff and service_role retain their existing server-side workflows.
drop policy if exists fiscal_insert on public.fiscal_contracts;
create policy fiscal_insert on public.fiscal_contracts
  for insert to authenticated with check ((select public.is_admin()));

-- No anonymous RPC calls to privileged helpers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_intern_authorized() from public, anon;
grant execute on function public.is_intern_authorized() to authenticated;

-- Ensure system triggers cannot pick up user-controlled functions via search_path.
alter function public.protect_profile() set search_path = '';
alter function public.protect_space() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.is_admin() set search_path = '';

-- Critical reservation values are derived from the database, not submitted prices.
create or replace function public.secure_booking_insert()
returns trigger language plpgsql set search_path = '' as $$
declare
  listed public.spaces%rowtype;
  hours numeric;
  addon_total numeric := 0;
begin
  if (select auth.uid()) is null then return new; end if; -- trusted service_role
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'A reserva deve pertencer à conta autenticada.' using errcode='42501';
  end if;
  if new.status <> 'confirmada' or new.check_in then
    raise exception 'Uma reserva nova não pode estar concluída, cancelada ou com check-in.' using errcode='42501';
  end if;
  if new.booking_date < (now() at time zone 'America/Maceio')::date then
    raise exception 'Não é permitido reservar datas passadas.' using errcode='22007';
  end if;
  select * into listed from public.spaces
  where id = new.space_id and approval='aprovado' and status='available';
  if not found then
    raise exception 'Este espaço não está disponível para reservas.' using errcode='23514';
  end if;
  hours := extract(epoch from (new.end_time - new.start_time)) / 3600;
  if hours < 1 or hours > 16 then
    raise exception 'Horário de reserva inválido.' using errcode='22007';
  end if;
  if coalesce(array_length(new.addons, 1), 0) > 1
     or exists(select 1 from unnest(coalesce(new.addons, array[]::text[])) as a(addon)
               where a.addon <> 'Gravação da Sala & Suporte A/V') then
    raise exception 'Serviço adicional não reconhecido.' using errcode='23514';
  end if;
  if coalesce(array_length(new.addons, 1), 0) = 1 then addon_total := 60; end if;
  new.space_name := listed.name;
  new.space_category := listed.category;
  new.coworking_name := listed.coworking_name;
  new.duration_hours := hours;
  new.total_price := round((hours * listed.price_per_hour) + addon_total, 2);
  return new;
end;
$$;

drop trigger if exists secure_booking_insert_trg on public.bookings;
create trigger secure_booking_insert_trg
before insert on public.bookings for each row execute function public.secure_booking_insert();

-- Customers can cancel their booking; only authorized staff/space owners can check in.
-- All financial fields, guest data and resource ownership are immutable after booking.
create or replace function public.secure_booking_update()
returns trigger language plpgsql set search_path = '' as $$
declare
  privileged boolean;
begin
  if (select auth.uid()) is null then return new; end if; -- service role
  privileged := (select public.is_admin()) or exists(
    select 1 from public.spaces s where s.id = old.space_id and s.owner_id = (select auth.uid())
  );
  if (to_jsonb(new) - 'status' - 'check_in') is distinct from
     (to_jsonb(old) - 'status' - 'check_in') then
    raise exception 'Não é possível alterar dados ou valores de uma reserva existente.' using errcode='42501';
  end if;

  if new.status is distinct from old.status then
    if old.status <> 'confirmada'
       or new.status not in ('cancelada', 'concluida')
       or (not privileged and (old.user_id is distinct from (select auth.uid()) or new.status <> 'cancelada')) then
      raise exception 'Transição de reserva não autorizada.' using errcode='42501';
    end if;
  end if;

  if new.check_in is distinct from old.check_in then
    if not privileged or old.check_in or not new.check_in or old.status <> 'confirmada' or new.status <> old.status then
      raise exception 'Apenas a equipe responsável pode registrar check-in.' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists secure_booking_update_trg on public.bookings;
create trigger secure_booking_update_trg
before update on public.bookings for each row execute function public.secure_booking_update();

-- A customer can only request digitalization; MVA staff controls receipt, document links and status.
create or replace function public.secure_correspondence_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or (select public.is_admin()) then return new; end if;
  if (to_jsonb(new) - 'digitalization_requested') is distinct from
     (to_jsonb(old) - 'digitalization_requested')
     or new.digitalization_requested is distinct from true then
    raise exception 'Você só pode solicitar a digitalização da sua correspondência.' using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger if exists secure_correspondence_update_trg on public.correspondence;
create trigger secure_correspondence_update_trg
before update on public.correspondence for each row execute function public.secure_correspondence_update();

commit;
