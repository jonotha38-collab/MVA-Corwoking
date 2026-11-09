-- MVA Coworking | nomes das reservas internas, visíveis só à equipe autorizada.
-- Mantém perfis/e-mails protegidos por RLS; o RPC retorna apenas nome e sala na data consultada.
begin;

create or replace function public.get_intern_room_occupants(p_date date)
returns table (
  room_id uuid,
  display_name text,
  is_mine boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if p_date is null or not public.is_intern_authorized() then
    raise exception 'Acesso às reservas internas não autorizado.' using errcode = '42501';
  end if;

  return query
  select
    b.room_id,
    coalesce(
      nullif(btrim(p.name), ''),
      nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data->>'name'), ''),
      'Colaborador'
    )::text as display_name,
    (b.user_id = (select auth.uid())) as is_mine
  from public.intern_room_reservations b
  left join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = b.user_id
  where b.reservation_date = p_date
    and b.status = 'ativa'
  order by b.room_id, b.created_at, b.id;
end;
$$;

revoke all on function public.get_intern_room_occupants(date) from public, anon, authenticated;
grant execute on function public.get_intern_room_occupants(date) to authenticated;

commit;
