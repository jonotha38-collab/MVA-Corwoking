-- =====================================================================
-- MVA Coworking Hub - esquema do banco (Supabase / PostgreSQL)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode ser executado mais de uma vez sem duplicar dados.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- Perfis (1 por usuário do Supabase Auth) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar text not null default '',
  account_type text not null default 'client' check (account_type in ('coworking_owner', 'client')),
  coworking_brand_name text,
  provider text not null default 'email',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, name, email, avatar, account_type, coworking_brand_name, provider)
  values (
    new.id,
    coalesce(nullif(meta->>'name', ''), nullif(meta->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    coalesce(nullif(meta->>'avatar_url', ''), nullif(meta->>'picture', ''), ''),
    case when meta->>'account_type' in ('coworking_owner', 'client') then meta->>'account_type' else 'client' end,
    nullif(meta->>'brand', ''),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ninguém vira administrador pelo app: só pelo SQL Editor (auth.uid() nulo).
create or replace function public.protect_profile()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.is_admin := old.is_admin; new.email := old.email; end if;
  return new;
end $$;
drop trigger if exists protect_profile_trg on public.profiles;
create trigger protect_profile_trg before update on public.profiles
  for each row execute function public.protect_profile();

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Espaços ----------
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  owner_name text,
  name text not null,
  coworking_name text not null,
  is_mva_headquarters boolean not null default false,
  street text not null,
  number text not null default '',
  neighborhood text not null default '',
  city text not null,
  state text not null default '',
  cep text,
  address text not null,
  category text not null check (category in ('reuniao', 'atendimento', 'auditorio', 'privada')),
  capacity int not null check (capacity > 0),
  price_per_hour numeric(10,2) not null check (price_per_hour >= 0),
  price_per_shift numeric(10,2),
  rating numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  amenities text[] not null default '{}',
  image text not null default '',
  gallery text[] not null default '{}',
  description text not null default '',
  status text not null default 'available' check (status in ('available', 'maintenance', 'occupied')),
  opening_hours text not null default '',
  offers_fiscal_address boolean not null default false,
  offers_correspondence boolean not null default false,
  approval text not null default 'pendente' check (approval in ('pendente', 'aprovado', 'rejeitado')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists spaces_approval_idx on public.spaces (approval);
create index if not exists spaces_owner_idx on public.spaces (owner_id);

-- Só administradores definem nota e avaliações.
create or replace function public.protect_space()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then new.rating := 0; new.reviews_count := 0;
    else new.rating := old.rating; new.reviews_count := old.reviews_count; end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_space_trg on public.spaces;
create trigger protect_space_trg before insert or update on public.spaces
  for each row execute function public.protect_space();

alter table public.spaces enable row level security;
drop policy if exists spaces_select on public.spaces;
drop policy if exists spaces_insert on public.spaces;
drop policy if exists spaces_update on public.spaces;
drop policy if exists spaces_delete on public.spaces;
-- Público vê só os aprovados; dono vê os seus; admin vê tudo.
create policy spaces_select on public.spaces for select
  using (approval = 'aprovado' or owner_id = auth.uid() or public.is_admin());
-- Anunciante só cria/edita como "pendente". Aprovar é exclusivo de administradores.
create policy spaces_insert on public.spaces for insert to authenticated
  with check (public.is_admin() or (owner_id = auth.uid() and approval = 'pendente' and is_mva_headquarters = false));
create policy spaces_update on public.spaces for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (owner_id = auth.uid() and approval = 'pendente' and is_mva_headquarters = false));
create policy spaces_delete on public.spaces for delete to authenticated
  using ((owner_id = auth.uid() and is_mva_headquarters = false) or public.is_admin());

-- ---------- Reservas (com bloqueio de horário duplicado) ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  space_name text not null,
  space_category text not null,
  coworking_name text not null,
  company_name text not null default '',
  responsible_name text not null,
  responsible_email text not null,
  responsible_phone text not null default '',
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  duration_hours numeric(5,2) not null,
  total_price numeric(10,2) not null,
  addons text[] not null default '{}',
  status text not null default 'confirmada' check (status in ('confirmada', 'concluida', 'cancelada')),
  check_in boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  constraint bookings_no_overlap exclude using gist (
    space_id with =,
    tsrange(booking_date + start_time, booking_date + end_time) with &&
  ) where (status = 'confirmada')
);
create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_space_idx on public.bookings (space_id);

alter table public.bookings enable row level security;
drop policy if exists bookings_select on public.bookings;
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_update on public.bookings;
create policy bookings_select on public.bookings for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));
create policy bookings_insert on public.bookings for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.spaces s where s.id = space_id and s.approval = 'aprovado' and s.status = 'available'));
create policy bookings_update on public.bookings for update to authenticated
  using (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()))
  with check (user_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.spaces s where s.id = space_id and s.owner_id = auth.uid()));

-- ---------- Contratos de endereço fiscal ----------
create table if not exists public.fiscal_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  trading_name text not null default '',
  cnpj text not null,
  contact_email text not null,
  contact_phone text not null default '',
  plan_name text not null,
  status text not null default 'ativo' check (status in ('ativo', 'em_aprovacao', 'pendente_documento')),
  start_date date not null default current_date,
  renewal_date date not null default (current_date + 365),
  coworking_provider_name text not null default 'MVA Coworking Sede',
  unit_address text not null default '',
  monthly_fee numeric(10,2) not null default 0,
  alvara_status text not null default 'em_processamento' check (alvara_status in ('regular', 'em_processamento')),
  alvara_protocol text not null default '',
  meeting_hours_allowance int not null default 0,
  meeting_hours_used int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists fiscal_user_idx on public.fiscal_contracts (user_id);

alter table public.fiscal_contracts enable row level security;
drop policy if exists fiscal_select on public.fiscal_contracts;
drop policy if exists fiscal_insert on public.fiscal_contracts;
drop policy if exists fiscal_update on public.fiscal_contracts;
create policy fiscal_select on public.fiscal_contracts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy fiscal_insert on public.fiscal_contracts for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy fiscal_update on public.fiscal_contracts for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Correspondências (recepção = administradores MVA) ----------
create table if not exists public.correspondence (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null,
  company_id uuid not null references public.fiscal_contracts(id) on delete cascade,
  company_name text not null,
  coworking_location text not null default '',
  sender text not null,
  type text not null check (type in ('carta', 'notificacao_judicial', 'encomenda', 'documento_fiscal')),
  priority text not null default 'normal' check (priority in ('normal', 'alta', 'urgente')),
  received_at timestamptz not null default now(),
  status text not null default 'aguardando_retirada' check (status in ('aguardando_retirada', 'digitalizado', 'retirado')),
  digitalization_requested boolean not null default false,
  digitalized_doc_url text,
  photo_url text,
  notes text,
  locker_number text,
  created_at timestamptz not null default now()
);
create index if not exists corr_company_idx on public.correspondence (company_id);

alter table public.correspondence enable row level security;
drop policy if exists corr_select on public.correspondence;
drop policy if exists corr_insert on public.correspondence;
drop policy if exists corr_update on public.correspondence;
create policy corr_select on public.correspondence for select to authenticated
  using (public.is_admin() or exists (select 1 from public.fiscal_contracts f where f.id = company_id and f.user_id = auth.uid()));
create policy corr_insert on public.correspondence for insert to authenticated with check (public.is_admin());
create policy corr_update on public.correspondence for update to authenticated
  using (public.is_admin() or exists (select 1 from public.fiscal_contracts f where f.id = company_id and f.user_id = auth.uid()));

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('space-photos', 'space-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
drop policy if exists photos_insert on storage.objects;
drop policy if exists photos_delete on storage.objects;
create policy photos_read on storage.objects for select using (bucket_id = 'space-photos');
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'space-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'space-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Dados iniciais: salas da sede MVA (troque as fotos pelas reais depois) ----------
do $$ begin if not exists (select 1 from public.spaces where is_mva_headquarters and name = 'Sala Master de Reunião & Diretoria MVA') then
insert into public.spaces (name, coworking_name, owner_name, is_mva_headquarters, street, number, neighborhood, city, state, cep, address, category, capacity, price_per_hour, price_per_shift, rating, reviews_count, amenities, image, gallery, description, status, opening_hours, offers_fiscal_address, offers_correspondence, approval)
values ('Sala Master de Reunião & Diretoria MVA', 'MVA Coworking', 'MVA Coworking', true, 'Rua Dom José Thomaz', '565', 'São José', 'Aracaju', 'SE', '49015-090', 'Rua Dom José Thomaz, 565 - São José, Aracaju - SE', 'reuniao', 12, 95, 320, 0, 0, array['Smart TV 70" 4K com videoconferência','Wi-Fi 6 de alta velocidade redundante','Quadro branco em vidro temperado','Café especial moído e água cortesia','Ar-condicionado individual','Recepção executiva no local','Estacionamento privativo']::text[], 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80', array['https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80']::text[], 'Sala de reunião corporativa da Sede Oficial MVA Coworking na Rua Dom José Thomaz, 565. Espaço premium com isolamento acústico, tecnologia para videoconferência e ambiente sofisticado para fechamento de negócios.', 'available', '08:00 às 20:00', true, true, 'aprovado');
end if; end $$;
do $$ begin if not exists (select 1 from public.spaces where is_mva_headquarters and name = 'Consultório & Sala de Atendimento Acústica MVA') then
insert into public.spaces (name, coworking_name, owner_name, is_mva_headquarters, street, number, neighborhood, city, state, cep, address, category, capacity, price_per_hour, price_per_shift, rating, reviews_count, amenities, image, gallery, description, status, opening_hours, offers_fiscal_address, offers_correspondence, approval)
values ('Consultório & Sala de Atendimento Acústica MVA', 'MVA Coworking', 'MVA Coworking', true, 'Rua Dom José Thomaz', '565', 'São José', 'Aracaju', 'SE', '49015-090', 'Rua Dom José Thomaz, 565 - São José, Aracaju - SE', 'atendimento', 3, 65, 220, 0, 0, array['Isolamento acústico completo','Poltronas de veludo ergonômicas','Mesa de apoio e biombo','Luz dimerizável aconchegante','Recepção com controle de visitas','Café especial e chás']::text[], 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80', '{}'::text[], 'Ambiente acolhedor e totalmente privativo projetado para psicólogos, terapeutas, médicos, coaches e consultores na Sede MVA Coworking.', 'available', '07:30 às 21:00', true, true, 'aprovado');
end if; end $$;

-- ---------- Torne-se administrador (rode UMA vez, depois de criar sua conta no site) ----------
-- update public.profiles set is_admin = true where email = 'seuemail@gmail.com';
