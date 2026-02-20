
-- Create stock_movements table for tracking all stock changes
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('restock', 'sale', 'adjustment', 'invoice_import', 'inventura')),
  quantity INTEGER NOT NULL, -- positive = stock in, negative = stock out
  unit_price NUMERIC(10,2) DEFAULT 0,
  note TEXT,
  source_ref TEXT, -- e.g. invoice number, sale order id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own stock movements"
  ON public.stock_movements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_user ON public.stock_movements(user_id, created_at DESC);
