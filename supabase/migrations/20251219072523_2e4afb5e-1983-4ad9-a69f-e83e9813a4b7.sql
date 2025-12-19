-- Fáze 1: Přidání payment_mode do clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS payment_mode TEXT 
  CHECK (payment_mode IN ('credit', 'cash_only', 'mixed')) 
  DEFAULT 'credit';