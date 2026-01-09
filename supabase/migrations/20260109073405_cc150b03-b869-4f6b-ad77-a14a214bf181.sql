-- Add min_sell_price and discount_eligible columns to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS min_sell_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_eligible boolean DEFAULT true;