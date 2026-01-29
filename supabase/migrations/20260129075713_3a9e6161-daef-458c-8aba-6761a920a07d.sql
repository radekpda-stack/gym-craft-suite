-- Add metadata column to notifications table for storing change details
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.notifications.metadata IS 'Stores additional data like profile change details for client_profile_updated notifications';