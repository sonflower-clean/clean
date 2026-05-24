-- Enable pgcrypto for UUIDs if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum for User Roles
CREATE TYPE user_role AS ENUM ('admin', 'laundry_manager', 'accommodation_manager');

-- Profiles table (extends Supabase Auth Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'accommodation_manager'::user_role NOT NULL,
  accommodation_id UUID, -- For accommodation_manager role
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Accommodations
CREATE TABLE public.accommodations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  business_number TEXT,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update foreign key in profiles
ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_accommodations 
  FOREIGN KEY (accommodation_id) REFERENCES public.accommodations(id) ON DELETE SET NULL;

-- Laundry Items
CREATE TABLE public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Accommodation Item Prices
-- We will just maintain the current price. When changed, it only affects new transactions.
CREATE TABLE public.accommodation_item_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  accommodation_id UUID REFERENCES public.accommodations(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  price INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(accommodation_id, item_id)
);

-- Daily Records (Overall collection event per accommodation per day)
CREATE TABLE public.daily_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  accommodation_id UUID REFERENCES public.accommodations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(date, accommodation_id)
);

-- Daily Record Items (The specific items and quantities for a record)
CREATE TABLE public.daily_record_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID REFERENCES public.daily_records(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 0 NOT NULL,
  applied_price INTEGER DEFAULT 0 NOT NULL, -- Snapshot of price at the time of entry
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(record_id, item_id)
);

-- Expenses
CREATE TABLE public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  category TEXT NOT NULL, -- 'consumables', 'maintenance', 'repair', 'damage'
  description TEXT,
  amount INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_record_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Admin has full access, others restricted)

-- Function to check admin role without infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Accommodations
CREATE POLICY "Anyone authenticated can view accommodations" ON public.accommodations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage accommodations" ON public.accommodations FOR ALL USING (public.is_admin());

-- Items
CREATE POLICY "Anyone authenticated can view items" ON public.items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage items" ON public.items FOR ALL USING (public.is_admin());

-- Prices
CREATE POLICY "Admins can manage prices" ON public.accommodation_item_prices FOR ALL USING (public.is_admin());
CREATE POLICY "Laundry managers can view prices" ON public.accommodation_item_prices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'laundry_manager')
);
CREATE POLICY "Accommodation managers can view their prices" ON public.accommodation_item_prices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'accommodation_manager' AND accommodation_id = accommodation_item_prices.accommodation_id)
);

-- Daily Records
CREATE POLICY "Admins can manage daily records" ON public.daily_records FOR ALL USING (public.is_admin());
CREATE POLICY "Laundry managers can manage daily records" ON public.daily_records FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'laundry_manager')
);
CREATE POLICY "Accommodation managers can view their records" ON public.daily_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'accommodation_manager' AND accommodation_id = daily_records.accommodation_id)
);

-- Daily Record Items
CREATE POLICY "Admins can manage daily record items" ON public.daily_record_items FOR ALL USING (public.is_admin());
CREATE POLICY "Laundry managers can manage daily record items" ON public.daily_record_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'laundry_manager')
);
CREATE POLICY "Accommodation managers can view their record items" ON public.daily_record_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.daily_records dr 
    JOIN public.profiles p ON p.accommodation_id = dr.accommodation_id
    WHERE dr.id = daily_record_items.record_id 
    AND p.id = auth.uid() 
    AND p.role = 'accommodation_manager'
  )
);

-- Expenses
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (public.is_admin());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(NULLIF(new.raw_user_meta_data->>'role', '')::public.user_role, 'accommodation_manager'::public.user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

