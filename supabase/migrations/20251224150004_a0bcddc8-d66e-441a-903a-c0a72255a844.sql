-- Drop existing foreign key constraints and recreate with CASCADE DELETE
-- This ensures that when a client is deleted, all related records are also deleted

-- training_sessions
ALTER TABLE public.training_sessions 
DROP CONSTRAINT IF EXISTS training_sessions_client_id_fkey;
ALTER TABLE public.training_sessions 
ADD CONSTRAINT training_sessions_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- exercise_entries
ALTER TABLE public.exercise_entries 
DROP CONSTRAINT IF EXISTS exercise_entries_client_id_fkey;
ALTER TABLE public.exercise_entries 
ADD CONSTRAINT exercise_entries_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- cardio_entries
ALTER TABLE public.cardio_entries 
DROP CONSTRAINT IF EXISTS cardio_entries_client_id_fkey;
ALTER TABLE public.cardio_entries 
ADD CONSTRAINT cardio_entries_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- mobility_entries
ALTER TABLE public.mobility_entries 
DROP CONSTRAINT IF EXISTS mobility_entries_client_id_fkey;
ALTER TABLE public.mobility_entries 
ADD CONSTRAINT mobility_entries_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- credit_transactions
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_client_id_fkey;
ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- measurements
ALTER TABLE public.measurements 
DROP CONSTRAINT IF EXISTS measurements_client_id_fkey;
ALTER TABLE public.measurements 
ADD CONSTRAINT measurements_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- diagnostics
ALTER TABLE public.diagnostics 
DROP CONSTRAINT IF EXISTS diagnostics_client_id_fkey;
ALTER TABLE public.diagnostics 
ADD CONSTRAINT diagnostics_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- client_media
ALTER TABLE public.client_media 
DROP CONSTRAINT IF EXISTS client_media_client_id_fkey;
ALTER TABLE public.client_media 
ADD CONSTRAINT client_media_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- client_packages
ALTER TABLE public.client_packages 
DROP CONSTRAINT IF EXISTS client_packages_client_id_fkey;
ALTER TABLE public.client_packages 
ADD CONSTRAINT client_packages_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- client_tags
ALTER TABLE public.client_tags 
DROP CONSTRAINT IF EXISTS client_tags_client_id_fkey;
ALTER TABLE public.client_tags 
ADD CONSTRAINT client_tags_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- client_recurring_schedules
ALTER TABLE public.client_recurring_schedules 
DROP CONSTRAINT IF EXISTS client_recurring_schedules_client_id_fkey;
ALTER TABLE public.client_recurring_schedules 
ADD CONSTRAINT client_recurring_schedules_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- client_training_phases
ALTER TABLE public.client_training_phases 
DROP CONSTRAINT IF EXISTS client_training_phases_client_id_fkey;
ALTER TABLE public.client_training_phases 
ADD CONSTRAINT client_training_phases_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- client_budget_members
ALTER TABLE public.client_budget_members 
DROP CONSTRAINT IF EXISTS client_budget_members_client_id_fkey;
ALTER TABLE public.client_budget_members 
ADD CONSTRAINT client_budget_members_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- feedback_requests
ALTER TABLE public.feedback_requests 
DROP CONSTRAINT IF EXISTS feedback_requests_client_id_fkey;
ALTER TABLE public.feedback_requests 
ADD CONSTRAINT feedback_requests_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- diagnostic_assessments_v2
ALTER TABLE public.diagnostic_assessments_v2 
DROP CONSTRAINT IF EXISTS diagnostic_assessments_v2_client_id_fkey;
ALTER TABLE public.diagnostic_assessments_v2 
ADD CONSTRAINT diagnostic_assessments_v2_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;