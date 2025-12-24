-- Add link_copied_at column to track when link was copied
ALTER TABLE public.feedback_requests 
ADD COLUMN IF NOT EXISTS link_copied_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.feedback_requests.link_copied_at IS 'Timestamp when the feedback link was copied to clipboard';