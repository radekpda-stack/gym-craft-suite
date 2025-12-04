-- Create products table (elektrolyty, energy drink, proteinová tyčinka, měření, etc.)
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'supplement',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on products"
ON public.products FOR ALL
USING (true)
WITH CHECK (true);

-- Create tags table
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on tags"
ON public.tags FOR ALL
USING (true)
WITH CHECK (true);

-- Create credit_transactions table (payments, training deductions, product purchases)
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('payment', 'training', 'product', 'manual')),
  description text,
  reference_id uuid,
  training_session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on credit_transactions"
ON public.credit_transactions FOR ALL
USING (true)
WITH CHECK (true);

-- Create transaction_tags junction table
CREATE TABLE public.transaction_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.credit_transactions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE(transaction_id, tag_id)
);

ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on transaction_tags"
ON public.transaction_tags FOR ALL
USING (true)
WITH CHECK (true);

-- Create app_settings table for configurable values
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_settings"
ON public.app_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Create audit_log table
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on audit_log"
ON public.audit_log FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default products
INSERT INTO public.products (name, price, category) VALUES
  ('Elektrolyty', 45, 'supplement'),
  ('Energy drink', 65, 'supplement'),
  ('Proteinová tyčinka', 65, 'supplement'),
  ('Měření', 500, 'service');

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('training_prices', '{"1": 800, "2": 1000, "3": 1200}', 'Ceny tréninků podle počtu osob'),
  ('low_credit_threshold', '500', 'Limit pro upozornění na nízký kredit'),
  ('currency', '"CZK"', 'Měna');

-- Update clients credit_balance default
ALTER TABLE public.clients ALTER COLUMN credit_balance SET DEFAULT 0;

-- Add participant_count to training_sessions for pricing
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS participant_count integer DEFAULT 1;

-- Create trigger for updating products updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();