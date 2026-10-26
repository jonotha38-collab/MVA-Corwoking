-- Agenda administrativa MVA. Avisos ficam disponíveis mesmo quando o administrador não está online.
-- Notificações guardam apenas referências (sem duplicar nome/e-mail de clientes).
begin;

create table if not exists public.admin_booking_notifications (
  id bigint generated always as identity primary key,
  source text not null check (source in ('commercial','intern')),
  reservation_id uuid not null,
  action text not null check (action in ('created','canceled')),
  created_at timestamptz not null default now(),
  unique (source, reservation_id, action)
);

create table if not exists public.admin_booking_notice_reads (
  notification_id bigint not null references public.admin_booking_notifications(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, admin_id)
);

create index if not exists admin_booking_notifications_recent_idx
  on public.admin_booking_notifications (created_at desc);
create index if not exists admin_booking_notice_reads_admin_idx
  on public.admin_booking_notice_reads (admin_id, notification_id);

alter table public.admin_booking_notifications enable row level security;
alter table public.admin_booking_notice_reads enable row level security;

revoke all on public.admin_booking_notifications, public.admin_booking_notice_reads from public, anon, authenticated;
grant select on public.admin_booking_notifications to authenticated;
grant select, insert on public.admin_booking_notice_reads to authenticated;
grant usage, select on sequence public.admin_booking_notifications_id_seq to authenticated;

drop policy if exists admin_booking_notifications_read on public.admin_booking_notifications;
create policy admin_booking_notifications_read on public.admin_booking_notifications for select to authenticated
  using ((select public.is_admin()));
drop policy if exists admin_booking_reads_select on public.admin_booking_notice_reads;
create policy admin_booking_reads_select on public.admin_booking_notice_reads for select to authenticated
  using (admin_id=(select auth.uid()) and (select public.is_admin()));
drop policy if exists admin_booking_reads_insert on public.admin_booking_notice_reads;
create policy admin_booking_reads_insert on public.admin_booking_notice_reads for insert to authenticated
  with check (admin_id=(select auth.uid()) and (select public.is_admin()));

create or replace function public.notify_admin_on_new_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' and new.status = 'confirmada' then
    insert into public.admin_booking_notifications(source,reservation_id,action)
    values('commercial',new.id,'created') on conflict do nothing;
  elsif tg_op='UPDATE' and old.status <> 'cancelada' and new.status = 'cancelada' then
    insert into public.admin_booking_notifications(source,reservation_id,action)
    values('commercial',new.id,'canceled') on conflict do nothing;
  end if;
  return new;
end;
$$;
create or replace function public.notify_admin_on_intern_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' and new.status = 'ativa' then
    insert into public.admin_booking_notifications(source,reservation_id,action)
    values('intern',new.id,'created') on conflict do nothing;
  elsif tg_op='UPDATE' and old.status <> 'cancelada' and new.status = 'cancelada' then
    insert into public.admin_booking_notifications(source,reservation_id,action)
    values('intern',new.id,'canceled') on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_admin_on_new_booking(), public.notify_admin_on_intern_booking() from public,anon,authenticated;

drop trigger if exists admin_commercial_reservation_alert on public.bookings;
create trigger admin_commercial_reservation_alert after insert or update of status on public.bookings
  for each row execute function public.notify_admin_on_new_booking();
drop trigger if exists admin_intern_reservation_alert on public.intern_room_reservations;
create trigger admin_intern_reservation_alert after insert or update of status on public.intern_room_reservations
  for each row execute function public.notify_admin_on_intern_booking();

-- Importante: nenhuma reserva antiga é convertida ou apagada. Histórico é lido nas tabelas originais.
commit;
