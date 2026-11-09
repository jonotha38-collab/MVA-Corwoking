-- MVA: auditável, reexecutável e sem credenciais em código público.
-- Entregas ficam pendentes até configurarmos os segredos de email e Google no Supabase.
begin;

create table if not exists public.booking_delivery_config (
  id smallint primary key default 1 check (id = 1),
  webhook_secret text not null default encode(gen_random_bytes(32),'hex'),
  created_at timestamptz not null default now()
);
insert into public.booking_delivery_config(id) values(1) on conflict(id) do nothing;
alter table public.booking_delivery_config enable row level security;
revoke all on public.booking_delivery_config from public, anon, authenticated;

create table if not exists public.booking_delivery_jobs (
  id bigint generated always as identity primary key,
  source text not null check (source in ('commercial','intern')),
  reservation_id uuid not null,
  action text not null check (action in ('created','canceled')),
  channel text not null check (channel in ('calendar','email')),
  status text not null default 'pending' check (status in ('pending','processing','sent','skipped','failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  external_id text,
  last_error text,
  created_at timestamptz not null default now(),
  constraint booking_delivery_jobs_unique unique(source,reservation_id,action,channel)
);
create index if not exists booking_delivery_jobs_due_idx
  on public.booking_delivery_jobs(status,next_attempt_at,id);
alter table public.booking_delivery_jobs enable row level security;
revoke all on public.booking_delivery_jobs from public, anon, authenticated;

-- Jobs são inseridos pelo trigger depois do INSERT/UPDATE confirmado no banco.
-- Dados pessoais nunca são copiados para a fila.
create or replace function public.enqueue_mva_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  source_kind text;
  old_state text;
  new_state text;
  event_action text;
begin
  source_kind := case when tg_table_name = 'bookings' then 'commercial' else 'intern' end;
  new_state := case when source_kind='commercial' then 'confirmada' else 'ativa' end;
  if tg_op = 'INSERT' then
    if new.status <> new_state then return new; end if;
    event_action := 'created';
  elsif tg_op = 'UPDATE' then
    old_state := old.status;
    if old_state = 'cancelada' or new.status <> 'cancelada' then return new; end if;
    event_action := 'canceled';
  else
    return new;
  end if;
  insert into public.booking_delivery_jobs(source,reservation_id,action,channel)
  values(source_kind,new.id,event_action,'calendar'),
        (source_kind,new.id,event_action,'email')
  on conflict(source,reservation_id,action,channel) do nothing;
  return new;
end;
$$;
revoke all on function public.enqueue_mva_delivery() from public, anon, authenticated;

drop trigger if exists mva_commercial_delivery_enqueue on public.bookings;
create trigger mva_commercial_delivery_enqueue
  after insert or update of status on public.bookings
  for each row execute function public.enqueue_mva_delivery();
drop trigger if exists mva_intern_delivery_enqueue on public.intern_room_reservations;
create trigger mva_intern_delivery_enqueue
  after insert or update of status on public.intern_room_reservations
  for each row execute function public.enqueue_mva_delivery();

-- Somente service_role pode reservar trabalhos pendentes. Lock e tentativas
-- são gerenciados de forma atômica para impedir concorrência acidental.
create or replace function public.claim_mva_delivery_jobs(
  p_channels text[], p_limit integer default 12
)
returns setof public.booking_delivery_jobs
language plpgsql security definer set search_path = '' as $$
begin
  if current_user <> 'service_role'
     and coalesce((nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role'), '') <> 'service_role' then
    raise exception 'Acesso restrito ao serviço de entrega.' using errcode='42501';
  end if;
  return query
  with candidates as (
    select j.id from public.booking_delivery_jobs j
    where j.channel = any(p_channels)
      and j.attempts < 8
      and j.next_attempt_at <= now()
      and (j.status='pending' or (j.status='processing' and j.locked_at < now()-interval '8 minutes'))
    order by j.id
    for update skip locked
    limit least(greatest(p_limit,1),20)
  )
  update public.booking_delivery_jobs j set status='processing', locked_at=now(), attempts=j.attempts+1
  from candidates c where j.id=c.id
  returning j.*;
end;
$$;
revoke all on function public.claim_mva_delivery_jobs(text[],integer) from public, anon, authenticated;
grant execute on function public.claim_mva_delivery_jobs(text[],integer) to service_role;
grant select on public.booking_delivery_config to service_role;
grant select, update on public.booking_delivery_jobs to service_role;

commit;
