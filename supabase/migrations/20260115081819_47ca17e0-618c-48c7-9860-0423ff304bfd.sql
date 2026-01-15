-- Fix credit top-up failure caused by overloaded rpc_add_credit_lot
-- PostgREST cannot choose between (uuid, integer, ...) and (uuid, numeric, ...)
-- Keep the newer NUMERIC version and remove the legacy INTEGER overload.

DROP FUNCTION IF EXISTS public.rpc_add_credit_lot(uuid, integer, text, text, uuid);