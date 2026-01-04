-- Change conversation_id from UUID to TEXT to support composite IDs like "trainerId-clientId"
ALTER TABLE public.chat_messages 
ALTER COLUMN conversation_id TYPE TEXT USING conversation_id::TEXT;