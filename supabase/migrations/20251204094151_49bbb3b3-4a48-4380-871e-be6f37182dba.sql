-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user id safely
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

-- Add user_id column to all user data tables
ALTER TABLE public.clients ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.training_sessions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.measurements ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.diagnostics ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.credit_transactions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.client_media ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tags ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.app_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing blanket policies
DROP POLICY IF EXISTS "Allow all operations on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all operations on training_sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Allow all operations on measurements" ON public.measurements;
DROP POLICY IF EXISTS "Allow all operations on diagnostics" ON public.diagnostics;
DROP POLICY IF EXISTS "Allow all operations on credit_transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Allow all operations on client_media" ON public.client_media;
DROP POLICY IF EXISTS "Allow all operations on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Allow all operations on tags" ON public.tags;
DROP POLICY IF EXISTS "Allow all operations on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow all operations on audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Allow all operations on transaction_tags" ON public.transaction_tags;

-- Create owner-scoped RLS policies for clients
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for training_sessions
CREATE POLICY "Users can view their own training_sessions" ON public.training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own training_sessions" ON public.training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own training_sessions" ON public.training_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own training_sessions" ON public.training_sessions FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for measurements
CREATE POLICY "Users can view their own measurements" ON public.measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own measurements" ON public.measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own measurements" ON public.measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own measurements" ON public.measurements FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for diagnostics
CREATE POLICY "Users can view their own diagnostics" ON public.diagnostics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own diagnostics" ON public.diagnostics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diagnostics" ON public.diagnostics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diagnostics" ON public.diagnostics FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for credit_transactions
CREATE POLICY "Users can view their own credit_transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own credit_transactions" ON public.credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own credit_transactions" ON public.credit_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own credit_transactions" ON public.credit_transactions FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for client_media
CREATE POLICY "Users can view their own client_media" ON public.client_media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own client_media" ON public.client_media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own client_media" ON public.client_media FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own client_media" ON public.client_media FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for products
CREATE POLICY "Users can view their own products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for tags
CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Create owner-scoped RLS policies for app_settings
CREATE POLICY "Users can view their own app_settings" ON public.app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own app_settings" ON public.app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own app_settings" ON public.app_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own app_settings" ON public.app_settings FOR DELETE USING (auth.uid() = user_id);

-- Create policies for user_roles (users can only see their own roles)
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Create policies for transaction_tags (join through credit_transactions)
CREATE POLICY "Users can view their own transaction_tags" ON public.transaction_tags FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.credit_transactions WHERE id = transaction_id AND user_id = auth.uid()));
CREATE POLICY "Users can create their own transaction_tags" ON public.transaction_tags FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.credit_transactions WHERE id = transaction_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their own transaction_tags" ON public.transaction_tags FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.credit_transactions WHERE id = transaction_id AND user_id = auth.uid()));

-- Audit log - users can view their own audit entries
ALTER TABLE public.audit_log ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE POLICY "Users can view their own audit_log" ON public.audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create audit_log entries" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('client-photos', 'client-audio');

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

-- Create storage policies for client-photos bucket
CREATE POLICY "Users can view their own client photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own client photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own client photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own client photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'client-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for client-audio bucket
CREATE POLICY "Users can view their own client audio" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own client audio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own client audio" ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own client audio" ON storage.objects FOR DELETE
  USING (bucket_id = 'client-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger to assign default role on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();