-- Add 'client_weight_added' to notification types constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'low_credit', 'negative_credit', 'birthday', 
  'milestone_100', 'milestone_500', 'milestone_1000', 
  'incomplete_training', 'feedback_received', 'feedback_red_flag', 
  'feedback_trend_alert', 'feedback_pending', 'client_anniversary', 
  'client_profile_updated', 'client_nutrition_started', 
  'pr_created', 'pr_updated', 'pr_achieved', 
  'package_low', 'package_expiring', 'inactivity_warning', 
  'training_streak', 'diagnostic_completed', 'pre_diagnostic_completed',
  'nutrition_entry_added', 'nutrition_inactive', 'client_weight_added'
));

-- Create function to notify trainer when client adds weight
CREATE OR REPLACE FUNCTION public.notify_trainer_on_client_weight()
RETURNS TRIGGER AS $$
DECLARE
  v_trainer_id uuid;
  v_client_name text;
  v_weight_formatted text;
BEGIN
  -- Only trigger on weight being added
  IF NEW.weight IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get trainer (user_id) and client name from clients table
  SELECT c.user_id, c.name INTO v_trainer_id, v_client_name
  FROM public.clients c
  WHERE c.id = NEW.client_id;
  
  IF v_trainer_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Format weight for display
  v_weight_formatted := ROUND(NEW.weight::numeric, 1)::text || ' kg';
  
  -- Check for duplicate notification today (prevent spam)
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_trainer_id
    AND client_id = NEW.client_id
    AND type = 'client_weight_added'
    AND created_at::date = CURRENT_DATE
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for trainer
  INSERT INTO public.notifications (
    user_id,
    client_id,
    type,
    title,
    message,
    is_read,
    created_at
  ) VALUES (
    v_trainer_id,
    NEW.client_id,
    'client_weight_added',
    '⚖️ Nová váha',
    v_client_name || ' přidal/a váhu: ' || v_weight_formatted,
    false,
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for client weight notifications
DROP TRIGGER IF EXISTS notify_trainer_on_weight ON public.measurements;

CREATE TRIGGER notify_trainer_on_weight
AFTER INSERT ON public.measurements
FOR EACH ROW
EXECUTE FUNCTION public.notify_trainer_on_client_weight();