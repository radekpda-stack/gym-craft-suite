-- Make email column nullable in clients table
ALTER TABLE public.clients ALTER COLUMN email DROP NOT NULL;

-- Set default empty string for email
ALTER TABLE public.clients ALTER COLUMN email SET DEFAULT '';