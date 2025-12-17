-- Tabulka pro 7denní nutriční log sessions
CREATE TABLE public.nutrition_log_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabulka pro záznamy jídla
CREATE TABLE public.nutrition_food_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.nutrition_log_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID,
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL DEFAULT LOCALTIME,
  description TEXT NOT NULL,
  portion_mode TEXT NOT NULL CHECK (portion_mode IN ('grams', 'portion_size', 'units')),
  grams INTEGER,
  portion_size TEXT CHECK (portion_size IN ('small', 'medium', 'large')),
  units_count NUMERIC,
  units_label TEXT,
  note TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabulka pro záznamy pití
CREATE TABLE public.nutrition_drink_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.nutrition_log_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID,
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL DEFAULT LOCALTIME,
  drink_type TEXT NOT NULL,
  drink_name TEXT,
  amount_ml INTEGER,
  amount_container_type TEXT,
  amount_container_count NUMERIC,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabulka pro záznamy kávy
CREATE TABLE public.nutrition_coffee_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.nutrition_log_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID,
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL DEFAULT LOCALTIME,
  coffee_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  sugar BOOLEAN DEFAULT false,
  sugar_spoons INTEGER DEFAULT 0,
  milk TEXT CHECK (milk IN ('none', 'little', 'normal', 'much')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_log_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_drink_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_coffee_entries ENABLE ROW LEVEL SECURITY;

-- RLS pro nutrition_log_sessions (trenér vidí své)
CREATE POLICY "Users can view their own nutrition_log_sessions" 
ON public.nutrition_log_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition_log_sessions" 
ON public.nutrition_log_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition_log_sessions" 
ON public.nutrition_log_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition_log_sessions" 
ON public.nutrition_log_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS pro food entries (trenér nebo public přes session)
CREATE POLICY "Users can view food entries for their sessions" 
ON public.nutrition_food_entries FOR SELECT 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can create food entries for their sessions" 
ON public.nutrition_food_entries FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can update food entries for their sessions" 
ON public.nutrition_food_entries FOR UPDATE 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete food entries for their sessions" 
ON public.nutrition_food_entries FOR DELETE 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

-- RLS pro drink entries
CREATE POLICY "Users can view drink entries for their sessions" 
ON public.nutrition_drink_entries FOR SELECT 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can create drink entries for their sessions" 
ON public.nutrition_drink_entries FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can update drink entries for their sessions" 
ON public.nutrition_drink_entries FOR UPDATE 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete drink entries for their sessions" 
ON public.nutrition_drink_entries FOR DELETE 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

-- RLS pro coffee entries
CREATE POLICY "Users can view coffee entries for their sessions" 
ON public.nutrition_coffee_entries FOR SELECT 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can create coffee entries for their sessions" 
ON public.nutrition_coffee_entries FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can update coffee entries for their sessions" 
ON public.nutrition_coffee_entries FOR UPDATE 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete coffee entries for their sessions" 
ON public.nutrition_coffee_entries FOR DELETE 
USING (EXISTS (SELECT 1 FROM nutrition_log_sessions WHERE id = session_id AND user_id = auth.uid()));

-- Trigger pro updated_at
CREATE TRIGGER update_nutrition_log_sessions_updated_at
BEFORE UPDATE ON public.nutrition_log_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();