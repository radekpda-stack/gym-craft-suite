-- Přidat sloupec pro SKU kód k produktům pro lepší mapování faktur
ALTER TABLE products ADD COLUMN sku_code TEXT;

-- Index pro rychlé vyhledávání podle SKU
CREATE INDEX idx_products_sku_code ON products(sku_code) WHERE sku_code IS NOT NULL;