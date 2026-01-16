-- Add first_name and last_name columns to clients table
ALTER TABLE public.clients 
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Create index for searching by names
CREATE INDEX idx_clients_first_name ON public.clients(first_name);
CREATE INDEX idx_clients_last_name ON public.clients(last_name);

-- Add comment explaining the fields
COMMENT ON COLUMN public.clients.first_name IS 'Křestní jméno klienta (používá se pro oslovení v klientském centru)';
COMMENT ON COLUMN public.clients.last_name IS 'Příjmení klienta';