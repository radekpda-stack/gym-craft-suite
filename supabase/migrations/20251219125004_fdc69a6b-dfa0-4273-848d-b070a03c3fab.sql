-- Add new columns for diagnostic form improvements
ALTER TABLE public.diagnostic_assessments
ADD COLUMN IF NOT EXISTS diagnostic_level text DEFAULT 'functional' CHECK (diagnostic_level IN ('quick', 'functional', 'deep')),

-- Mobility side and notes
ADD COLUMN IF NOT EXISTS mobility_ankles_side text,
ADD COLUMN IF NOT EXISTS mobility_ankles_note text,
ADD COLUMN IF NOT EXISTS mobility_hips_side text,
ADD COLUMN IF NOT EXISTS mobility_hips_note text,
ADD COLUMN IF NOT EXISTS mobility_thoracic_side text,
ADD COLUMN IF NOT EXISTS mobility_thoracic_note text,
ADD COLUMN IF NOT EXISTS mobility_shoulders_side text,
ADD COLUMN IF NOT EXISTS mobility_shoulders_note text,
ADD COLUMN IF NOT EXISTS core_stability_note text,

-- Movement quality side and notes
ADD COLUMN IF NOT EXISTS squat_side text,
ADD COLUMN IF NOT EXISTS squat_note text,
ADD COLUMN IF NOT EXISTS lunge_side text,
ADD COLUMN IF NOT EXISTS lunge_note text,
ADD COLUMN IF NOT EXISTS push_side text,
ADD COLUMN IF NOT EXISTS push_note text,
ADD COLUMN IF NOT EXISTS pull_side text,
ADD COLUMN IF NOT EXISTS pull_note text,
ADD COLUMN IF NOT EXISTS hip_hinge_side text,
ADD COLUMN IF NOT EXISTS hip_hinge_note text,

-- Pain duration, trigger, side
ADD COLUMN IF NOT EXISTS pain_ankle_duration text,
ADD COLUMN IF NOT EXISTS pain_ankle_trigger text[],
ADD COLUMN IF NOT EXISTS pain_ankle_side text,
ADD COLUMN IF NOT EXISTS pain_knee_duration text,
ADD COLUMN IF NOT EXISTS pain_knee_trigger text[],
ADD COLUMN IF NOT EXISTS pain_knee_side text,
ADD COLUMN IF NOT EXISTS pain_hip_duration text,
ADD COLUMN IF NOT EXISTS pain_hip_trigger text[],
ADD COLUMN IF NOT EXISTS pain_hip_side text,
ADD COLUMN IF NOT EXISTS pain_si_duration text,
ADD COLUMN IF NOT EXISTS pain_si_trigger text[],
ADD COLUMN IF NOT EXISTS pain_si_side text,
ADD COLUMN IF NOT EXISTS pain_lumbar_duration text,
ADD COLUMN IF NOT EXISTS pain_lumbar_trigger text[],
ADD COLUMN IF NOT EXISTS pain_lumbar_side text,
ADD COLUMN IF NOT EXISTS pain_thoracic_duration text,
ADD COLUMN IF NOT EXISTS pain_thoracic_trigger text[],
ADD COLUMN IF NOT EXISTS pain_thoracic_side text,
ADD COLUMN IF NOT EXISTS pain_shoulder_duration text,
ADD COLUMN IF NOT EXISTS pain_shoulder_trigger text[],
ADD COLUMN IF NOT EXISTS pain_shoulder_side text,
ADD COLUMN IF NOT EXISTS pain_neck_duration text,
ADD COLUMN IF NOT EXISTS pain_neck_trigger text[],
ADD COLUMN IF NOT EXISTS pain_neck_side text,

-- Structured trainer notes
ADD COLUMN IF NOT EXISTS trainer_risks text,
ADD COLUMN IF NOT EXISTS trainer_priorities text,
ADD COLUMN IF NOT EXISTS trainer_limitations text,
ADD COLUMN IF NOT EXISTS trainer_other_notes text,

-- Simplified psychology
ADD COLUMN IF NOT EXISTS training_barrier text,

-- Combined restrictions/allergies field
ADD COLUMN IF NOT EXISTS all_restrictions text[];