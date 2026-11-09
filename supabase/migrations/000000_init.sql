-- SQL Schema for MVA Coworking Hub on Supabase

-- Enums
CREATE TYPE account_type AS ENUM ('client', 'coworking_owner', 'admin');
CREATE TYPE space_category AS ENUM ('reuniao', 'atendimento', 'privativa', 'compartilhada', 'estudio');
CREATE TYPE space_status AS ENUM ('available', 'maintenance', 'hidden');
CREATE TYPE fiscal_contract_status AS ENUM ('ativo', 'pendente', 'cancelado', 'inativo');
CREATE TYPE correspondence_status AS ENUM ('recebido', 'notificado', 'aguardando_retirada', 'retirado', 'digitalizado');

-- 1. Users Profile (Extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  account_type account_type DEFAULT 'client',
  coworking_brand_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Spaces
CREATE TABLE public.spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coworking_name TEXT,
  is_mva_headquarters BOOLEAN DEFAULT false,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  cep TEXT NOT NULL,
  category space_category DEFAULT 'reuniao',
  capacity INTEGER NOT NULL DEFAULT 1,
  price_per_hour NUMERIC(10,2) NOT NULL,
  price_per_shift NUMERIC(10,2),
  rating NUMERIC(3,2) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0,
  amenities TEXT[] DEFAULT '{}',
  image TEXT,
  gallery TEXT[] DEFAULT '{}',
  description TEXT,
  status space_status DEFAULT 'available',
  opening_hours TEXT,
  offers_fiscal_address BOOLEAN DEFAULT false,
  offers_correspondence BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fiscal Contracts
CREATE TABLE public.fiscal_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  trading_name TEXT NOT NULL,
  cnpj TEXT UNIQUE NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  status fiscal_contract_status DEFAULT 'pendente',
  start_date DATE NOT NULL,
  renewal_date DATE,
  coworking_provider_name TEXT NOT NULL,
  unit_address TEXT NOT NULL,
  monthly_fee NUMERIC(10,2) NOT NULL,
  alvara_status TEXT DEFAULT 'pendente',
  alvara_protocol TEXT,
  meeting_hours_allowance INTEGER DEFAULT 0,
  meeting_hours_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Correspondences
CREATE TABLE public.correspondences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_code TEXT NOT NULL,
  company_id UUID REFERENCES public.fiscal_contracts(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  received_date TIMESTAMPTZ DEFAULT NOW(),
  status correspondence_status DEFAULT 'recebido',
  digitalization_requested BOOLEAN DEFAULT false,
  digitalized_doc_url TEXT,
  locker_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bookings
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente',
  check_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) configurations

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Spaces are viewable by everyone." ON public.spaces FOR SELECT USING (true);
CREATE POLICY "Owners can insert spaces." ON public.spaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own spaces." ON public.spaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own spaces." ON public.spaces FOR DELETE USING (auth.uid() = owner_id);

ALTER TABLE public.fiscal_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own contracts" ON public.fiscal_contracts FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users insert own contracts" ON public.fiscal_contracts FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users update own contracts" ON public.fiscal_contracts FOR UPDATE USING (auth.uid() = client_id);

ALTER TABLE public.correspondences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own correspondence" ON public.correspondences FOR SELECT USING (
  company_id IN (SELECT id FROM public.fiscal_contracts WHERE client_id = auth.uid())
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users insert own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = client_id);

-- Expose Realtime
alter publication supabase_realtime add table public.correspondences;
alter publication supabase_realtime add table public.bookings;
