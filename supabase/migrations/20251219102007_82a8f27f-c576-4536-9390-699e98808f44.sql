-- Remove the problematic unique constraint on just 'key'
-- Keep only the composite constraint on 'key' + 'user_id'
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;