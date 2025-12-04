-- Add unique constraint for app_settings to allow proper upsert
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_key_user_id_key UNIQUE (key, user_id);