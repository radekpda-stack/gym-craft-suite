-- Create measurements table
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,1),
  muscle_mass DECIMAL(5,2),
  basal_metabolism INTEGER,
  chest DECIMAL(5,1),
  waist DECIMAL(5,1),
  hips DECIMAL(5,1),
  bicep_left DECIMAL(5,1),
  bicep_right DECIMAL(5,1),
  thigh_left DECIMAL(5,1),
  thigh_right DECIMAL(5,1),
  calf_left DECIMAL(5,1),
  calf_right DECIMAL(5,1),
  mental_state INTEGER CHECK (mental_state >= 1 AND mental_state <= 10),
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create diagnostics table
CREATE TABLE public.diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  area_type TEXT NOT NULL CHECK (area_type IN ('joint', 'muscle')),
  area_name TEXT NOT NULL,
  findings TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single trainer app)
CREATE POLICY "Allow all operations on measurements" 
ON public.measurements FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on diagnostics" 
ON public.diagnostics FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_measurements_client_id ON public.measurements(client_id);
CREATE INDEX idx_measurements_date ON public.measurements(date DESC);
CREATE INDEX idx_diagnostics_client_id ON public.diagnostics(client_id);
CREATE INDEX idx_diagnostics_date ON public.diagnostics(date DESC);