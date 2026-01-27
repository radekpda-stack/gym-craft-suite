-- Add extended columns to training_template_exercises for RX V2
ALTER TABLE training_template_exercises
ADD COLUMN IF NOT EXISTS incline_percent NUMERIC,
ADD COLUMN IF NOT EXISTS speed_setting TEXT,
ADD COLUMN IF NOT EXISTS damper_resistance INTEGER,
ADD COLUMN IF NOT EXISTS round_marker TEXT,
ADD COLUMN IF NOT EXISTS load_format TEXT;

-- Create rx_workout_results table for direct result tracking
CREATE TABLE IF NOT EXISTS rx_workout_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rx_workout_id UUID NOT NULL REFERENCES training_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Score
  score_primary NUMERIC NOT NULL,
  score_secondary NUMERIC,
  
  -- Metadata
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Who recorded
  recorded_by_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one result per client per day per workout
  CONSTRAINT unique_rx_result_per_day UNIQUE (rx_workout_id, client_id, performed_at)
);

-- Enable RLS
ALTER TABLE rx_workout_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for rx_workout_results
CREATE POLICY "Users can view rx_workout_results" ON rx_workout_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_templates tt
      WHERE tt.id = rx_workout_results.rx_workout_id
      AND tt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rx_workout_results" ON rx_workout_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_templates tt
      WHERE tt.id = rx_workout_results.rx_workout_id
      AND tt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rx_workout_results" ON rx_workout_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM training_templates tt
      WHERE tt.id = rx_workout_results.rx_workout_id
      AND tt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rx_workout_results" ON rx_workout_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM training_templates tt
      WHERE tt.id = rx_workout_results.rx_workout_id
      AND tt.user_id = auth.uid()
    )
  );

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_rx_results_workout_score ON rx_workout_results(rx_workout_id, score_primary);
CREATE INDEX IF NOT EXISTS idx_rx_results_client ON rx_workout_results(client_id);