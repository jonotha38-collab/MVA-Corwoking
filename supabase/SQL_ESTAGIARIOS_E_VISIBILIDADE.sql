-- MVA Coworking | salas internas dos estagiários e anúncios ocultos
-- Execute UMA VEZ (e com segurança em reexecuções) no SQL Editor do Supabase.
-- Requer o esquema principal de supabase/schema.sql já instalado.
-- Os endereços autorizados são configurados no fim deste arquivo ou na tabela intern_allowed_emails.

begin;

-- Um anúncio oculto não é exposto ao público, mas permanece visível ao dono e à MVA.
alter table public.spaces drop constraint if exists spaces_status_check;
alter table public.spaces add constraint spaces_status_check
  check (status::text in ('available', 'maintenance', 'occupied', 'hidden'));

drop policy if exists spaces_select on public.spaces;
create policy spaces_select on public.spaces for select
  using (
    (approval = 'aprovado' and status::text <> 'hidden')
    or owner_id = (select auth.uid())
    or public.is_admin()
  );

-- Trocar apenas a visibilidade não força uma nova aprovação. Uma alteração
-- de conteúdo continua exigindo que o anúncio volte para análise.
drop policy if exists spaces_update on public.spaces;
create policy spaces_update on public.spaces for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (
    public.is_admin()
    or (owner_id = (select auth.uid()) and is_mva_headquarters = false)
  );

create or replace function public.enforce_space_visibility_integrity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if old.owner_id is distinct from (select auth.uid())
     or new.owner_id is distinct from old.owner_id
     or new.is_mva_headquarters is distinct from old.is_mva_headquarters
     or old.is_mva_headquarters then
    raise exception 'Você não pode alterar o proprietário ou a sede MVA.' using errcode = '42501';
  end if;

  if new.approval = 'aprovado' and old.approval is distinct from 'aprovado' then
    raise exception 'Somente a MVA pode aprovar um anúncio.' using errcode = '42501';
  end if;

  if new.approval not in (old.approval, 'pendente') then
    raise exception 'Transição de aprovação não permitida.' using errcode = '42501';
  end if;

  if old.approval = 'aprovado' and new.approval = 'aprovado'
     and (to_jsonb(new) - 'status' - 'updated_at')
         is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Para editar um anúncio publicado, reenvie-o para aprovação.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_space_visibility_integrity_trg on public.spaces;
create trigger enforce_space_visibility_integrity_trg
  before update on public.spaces for each row
  execute function public.enforce_space_visibility_integrity();

-- Lista administrada pelo SQL Editor. Nenhum estagiário edita as permissões.
create table if not exists public.intern_allowed_emails (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint intern_email_normalized check (email = lower(btrim(email)) and position('@' in email) > 1)
);
create index if not exists intern_allowed_active_idx on public.intern_allowed_emails (email) where active;
alter table public.intern_allowed_emails enable row level security;
revoke all on public.intern_allowed_emails from anon, authenticated;
grant select on public.intern_allowed_emails to authenticated;
drop policy if exists intern_allowed_admin_select on public.intern_allowed_emails;
create policy intern_allowed_admin_select on public.intern_allowed_emails
  for select to authenticated using (public.is_admin());

-- Autorização validada pelo Supabase Auth, nunca pelo e-mail informado no frontend.
create or replace function public.is_intern_authorized()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    public.is_admin()
    or exists (
      select 1 from auth.users u
      join public.intern_allowed_emails a on a.email = lower(u.email)
      where u.id = (select auth.uid())
        and u.email_confirmed_at is not null
        and a.active
    )
  );
$$;
revoke all on function public.is_intern_authorized() from public, anon;
grant execute on function public.is_intern_authorized() to authenticated;

-- Somente duas salas internas: configure nome, descrição e capacidade conforme a realidade.
create table if not exists public.intern_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('sala-1', 'sala-2')),
  name text not null,
  description text not null default '',
  capacity integer not null default 1 check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.intern_rooms (code, name, description, capacity)
values
  ('sala-1', 'Sala de Trabalho 1', 'Espaço de trabalho reservado aos estagiários autorizados.', 6),
  ('sala-2', 'Sala de Trabalho 2', 'Espaço de trabalho reservado aos estagiários autorizados.', 4)
on conflict (code) do nothing;
alter table public.intern_rooms enable row level security;
revoke all on public.intern_rooms from anon, authenticated;
grant select on public.intern_rooms to authenticated;
drop policy if exists intern_rooms_read on public.intern_rooms;
create policy intern_rooms_read on public.intern_rooms for select to authenticated
  using (public.is_intern_authorized());

-- Reservas por dia. Uma pessoa só pode ocupar uma sala por data.
create table if not exists public.intern_room_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.intern_rooms(id) on delete restrict,
  reservation_date date not null,
  status text not null default 'ativa' check (status in ('ativa', 'cancelada')),
  created_at timestamptz not null default now()
);
create unique index if not exists intern_one_room_per_day
  on public.intern_room_reservations (user_id, reservation_date) where status = 'ativa';
create index if not exists intern_room_day_lookup
  on public.intern_room_reservations (room_id, reservation_date) where status = 'ativa';
alter table public.intern_room_reservations enable row level security;
revoke all on public.intern_room_reservations from anon, authenticated;
grant select, insert, update on public.intern_room_reservations to authenticated;

drop policy if exists intern_reservations_read on public.intern_room_reservations;
create policy intern_reservations_read on public.intern_room_reservations for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists intern_reservations_insert on public.intern_room_reservations;
create policy intern_reservations_insert on public.intern_room_reservations for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'ativa'
    and public.is_intern_authorized()
    and exists (select 1 from public.intern_rooms r where r.id = room_id and r.active)
  );
drop policy if exists intern_reservations_update on public.intern_room_reservations;
create policy intern_reservations_update on public.intern_room_reservations for update to authenticated
  using (user_id = (select auth.uid()) and public.is_intern_authorized())
  with check (user_id = (select auth.uid()) and public.is_intern_authorized() and status = 'cancelada');

-- Bloqueio transacional para não vender/reservar o último lugar duas vezes.
create or replace function public.enforce_intern_room_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  max_places integer;
  occupied integer;
begin
  if (select auth.uid()) is null or new.user_id is distinct from (select auth.uid())
      or not public.is_intern_authorized() then
    raise exception 'Não autorizado a reservar salas internas.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.room_id is distinct from old.room_id
       or new.reservation_date is distinct from old.reservation_date
       or new.created_at is distinct from old.created_at
       or old.status <> 'ativa' or new.status <> 'cancelada' then
      raise exception 'Somente o cancelamento da própria reserva é permitido.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status <> 'ativa' then
    raise exception 'Reservas novas precisam estar ativas.' using errcode = '23514';
  end if;
  if new.reservation_date < (now() at time zone 'America/Maceio')::date then
    raise exception 'Não é permitido reservar datas passadas.' using errcode = '22007';
  end if;

  -- O lock na sala serializa as reservas simultâneas, inclusive de usuários diferentes.
  select capacity into max_places
  from public.intern_rooms where id = new.room_id and active for update;
  if max_places is null then
    raise exception 'Sala desativada ou inexistente.' using errcode = '23514';
  end if;
  select count(*) into occupied from public.intern_room_reservations
  where room_id = new.room_id and reservation_date = new.reservation_date and status = 'ativa';
  if occupied >= max_places then
    raise exception 'Esta sala está lotada nesta data.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_intern_room_capacity() from public, anon, authenticated;
drop trigger if exists enforce_intern_room_capacity_trg on public.intern_room_reservations;
create trigger enforce_intern_room_capacity_trg
  before insert or update on public.intern_room_reservations
  for each row execute function public.enforce_intern_room_capacity();

-- Contagem agregada sem divulgar nomes / e-mails de outros estagiários.
create or replace function public.get_intern_room_availability(p_date date)
returns table (room_id uuid, room_code text, room_name text, room_description text,
               room_capacity integer, room_active boolean, places_taken bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_intern_authorized() then
    raise exception 'Acesso às salas internas não autorizado.' using errcode = '42501';
  end if;
  return query
    select r.id, r.code, r.name, r.description, r.capacity, r.active,
           count(b.id)::bigint
    from public.intern_rooms r
    left join public.intern_room_reservations b
      on b.room_id = r.id and b.reservation_date = p_date and b.status = 'ativa'
    group by r.id, r.code, r.name, r.description, r.capacity, r.active
    order by r.code;
end;
$$;
revoke all on function public.get_intern_room_availability(date) from public, anon;
grant execute on function public.get_intern_room_availability(date) to authenticated;

commit;

-- CONFIGURAÇÃO: execute estas linhas SEPARADAMENTE após trocar pelos e-mails reais:
-- insert into public.intern_allowed_emails (email, active)
-- values ('estagiario1@empresa.com.br', true), ('estagiario2@empresa.com.br', true)
-- on conflict (email) do update set active = excluded.active;
-- Para revogar o acesso: update public.intern_allowed_emails set active = false where email = 'estagiario1@empresa.com.br';
-- Para adequar a lotação: update public.intern_rooms set capacity = 4 where code = 'sala-1';
