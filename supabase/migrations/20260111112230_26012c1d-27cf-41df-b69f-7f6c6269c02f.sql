-- Create business_expenses table for tracking trainer operational costs
CREATE TABLE public.business_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Basic data
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Category
  category TEXT NOT NULL CHECK (category IN (
    'rent',           -- Nájem/Provize
    'equipment',      -- Vybavení
    'education',      -- Vzdělávání
    'marketing',      -- Marketing
    'software',       -- Software/Licence
    'transport',      -- Doprava
    'insurance',      -- Pojištění
    'other'           -- Ostatní
  )),
  
  -- Recurring expenses
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('monthly', 'quarterly', 'yearly')),
  recurring_end_date DATE,
  parent_expense_id UUID REFERENCES public.business_expenses(id) ON DELETE SET NULL,
  
  -- Metadata
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies - trainers can only see their own expenses
CREATE POLICY "Users can view their own expenses"
  ON public.business_expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
  ON public.business_expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.business_expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.business_expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_business_expenses_user_id ON public.business_expenses(user_id);
CREATE INDEX idx_business_expenses_date ON public.business_expenses(date);
CREATE INDEX idx_business_expenses_category ON public.business_expenses(category);
CREATE INDEX idx_business_expenses_user_date ON public.business_expenses(user_id, date);

-- Trigger for updated_at
CREATE TRIGGER update_business_expenses_updated_at
  BEFORE UPDATE ON public.business_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();