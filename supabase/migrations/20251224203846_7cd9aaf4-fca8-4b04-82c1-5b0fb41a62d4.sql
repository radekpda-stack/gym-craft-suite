-- Add opened_at column to feedback_requests table
ALTER TABLE public.feedback_requests
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;

-- Add opened_at column to pre_diagnostic_forms table
ALTER TABLE public.pre_diagnostic_forms
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.feedback_requests.opened_at IS 'Timestamp when the client first opened the feedback form';
COMMENT ON COLUMN public.pre_diagnostic_forms.opened_at IS 'Timestamp when the client first opened the pre-diagnostic form';