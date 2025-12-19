-- Fáze 3: Ochrana proti duplicitním transakcím - jeden trénink = max jedna transakce typu 'training'
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_training_transaction 
  ON public.credit_transactions (training_session_id) 
  WHERE training_session_id IS NOT NULL AND type = 'training';