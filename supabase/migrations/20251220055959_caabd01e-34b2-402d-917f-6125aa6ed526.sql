-- Create training packages table (predefined package definitions)
CREATE TABLE public.training_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  training_count INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  validity_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create client packages table (purchased packages)
CREATE TABLE public.client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.training_packages(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  trainings_total INTEGER NOT NULL,
  trainings_used INTEGER DEFAULT 0,
  price_paid NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

-- RLS policies for training_packages
CREATE POLICY "Users can view their own packages" 
ON public.training_packages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own packages" 
ON public.training_packages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own packages" 
ON public.training_packages FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own packages" 
ON public.training_packages FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for client_packages
CREATE POLICY "Users can view their client packages" 
ON public.client_packages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create client packages" 
ON public.client_packages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update client packages" 
ON public.client_packages FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete client packages" 
ON public.client_packages FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_training_packages_user_id ON public.training_packages(user_id);
CREATE INDEX idx_client_packages_client_id ON public.client_packages(client_id);
CREATE INDEX idx_client_packages_user_id ON public.client_packages(user_id);
CREATE INDEX idx_client_packages_expires_at ON public.client_packages(expires_at);

-- Update trigger for timestamps
CREATE TRIGGER update_training_packages_updated_at
BEFORE UPDATE ON public.training_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_packages_updated_at
BEFORE UPDATE ON public.client_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();