-- Create shared nutrition food items table
CREATE TABLE public.nutrition_food_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL, -- Diacritic-free for search
  category TEXT, -- breakfast, lunch, dinner, snack
  default_portion_mode TEXT DEFAULT 'portion',
  default_grams INTEGER,
  created_by_user_id UUID, -- NULL = system item
  usage_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false, -- Trainer can approve items
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create shared nutrition drink items table
CREATE TABLE public.nutrition_drink_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL, -- Diacritic-free for search
  drink_type TEXT NOT NULL, -- water, juice, etc.
  default_ml INTEGER,
  is_carbonated BOOLEAN DEFAULT false,
  created_by_user_id UUID, -- NULL = system item
  usage_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_drink_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for food items - everyone can read, authenticated can create
CREATE POLICY "Anyone can view food items"
ON public.nutrition_food_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create food items"
ON public.nutrition_food_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Trainers can update their food items"
ON public.nutrition_food_items FOR UPDATE
USING (created_by_user_id = auth.uid() OR created_by_user_id IS NULL);

-- RLS policies for drink items
CREATE POLICY "Anyone can view drink items"
ON public.nutrition_drink_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create drink items"
ON public.nutrition_drink_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Trainers can update their drink items"
ON public.nutrition_drink_items FOR UPDATE
USING (created_by_user_id = auth.uid() OR created_by_user_id IS NULL);

-- Create indexes for fast search
CREATE INDEX idx_nutrition_food_items_name_normalized 
ON public.nutrition_food_items(name_normalized);

CREATE INDEX idx_nutrition_drink_items_name_normalized 
ON public.nutrition_drink_items(name_normalized);

CREATE INDEX idx_nutrition_food_items_usage 
ON public.nutrition_food_items(usage_count DESC);

CREATE INDEX idx_nutrition_drink_items_usage 
ON public.nutrition_drink_items(usage_count DESC);

-- Insert some default food items (common Czech foods)
INSERT INTO public.nutrition_food_items (name, name_normalized, category, default_portion_mode, default_grams) VALUES
('Kuřecí prsa', 'kureci prsa', 'lunch', 'grams', 150),
('Rýže', 'ryze', 'lunch', 'grams', 150),
('Brambory', 'brambory', 'lunch', 'grams', 200),
('Těstoviny', 'testoviny', 'lunch', 'grams', 200),
('Ovesná kaše', 'ovesna kase', 'breakfast', 'portion', NULL),
('Vejce', 'vejce', 'breakfast', 'units', NULL),
('Chléb', 'chleb', 'breakfast', 'units', NULL),
('Salát', 'salat', 'lunch', 'portion', NULL),
('Jogurt', 'jogurt', 'snack', 'portion', NULL),
('Ovoce', 'ovoce', 'snack', 'portion', NULL),
('Banán', 'banan', 'snack', 'units', NULL),
('Jablko', 'jablko', 'snack', 'units', NULL),
('Hovězí maso', 'hovezi maso', 'lunch', 'grams', 150),
('Losos', 'losos', 'lunch', 'grams', 150),
('Tvaroh', 'tvaroh', 'breakfast', 'grams', 200);

-- Insert some default drink items
INSERT INTO public.nutrition_drink_items (name, name_normalized, drink_type, default_ml, is_carbonated) VALUES
('Voda', 'voda', 'water', 250, false),
('Perlivá voda', 'perliva voda', 'sparkling', 250, true),
('Zelený čaj', 'zeleny caj', 'tea', 250, false),
('Černý čaj', 'cerny caj', 'tea', 250, false),
('Pomerančový džus', 'pomerancovy dzus', 'juice', 200, false),
('Jablečný džus', 'jablecny dzus', 'juice', 200, false),
('Minerálka', 'mineralka', 'mineral', 330, true),
('Coca-Cola', 'coca-cola', 'cola', 330, true),
('Isostar', 'isostar', 'sports', 500, false),
('Pivo', 'pivo', 'alcohol', 500, true),
('Víno', 'vino', 'alcohol', 150, false);
