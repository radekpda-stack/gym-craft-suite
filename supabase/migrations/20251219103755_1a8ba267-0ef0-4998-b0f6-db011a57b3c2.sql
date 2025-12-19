-- Tabulka pro sdílení kalendářů mezi trenéry
CREATE TABLE public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  shared_with_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

-- Vlastník může spravovat své sdílení
CREATE POLICY "Owners can manage their shares"
ON public.calendar_shares
FOR ALL
USING (auth.uid() = owner_user_id);

-- Příjemce může vidět a aktualizovat pozvánky pro sebe
CREATE POLICY "Recipients can view and respond to their invitations"
ON public.calendar_shares
FOR SELECT
USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Recipients can update their invitation status"
ON public.calendar_shares
FOR UPDATE
USING (auth.uid() = shared_with_user_id)
WITH CHECK (auth.uid() = shared_with_user_id AND status IN ('accepted', 'rejected'));

-- Trigger pro updated_at
CREATE TRIGGER update_calendar_shares_updated_at
BEFORE UPDATE ON public.calendar_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabulka pro dostupnost (availability) trenéra
CREATE TABLE public.trainer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week, start_time)
);

-- Enable RLS
ALTER TABLE public.trainer_availability ENABLE ROW LEVEL SECURITY;

-- Každý může vidět dostupnost (pro návrhy slotů)
CREATE POLICY "Users can view all availability"
ON public.trainer_availability
FOR SELECT
TO authenticated
USING (true);

-- Uživatel může spravovat svou dostupnost
CREATE POLICY "Users can manage their availability"
ON public.trainer_availability
FOR ALL
USING (auth.uid() = user_id);

-- Trigger pro updated_at
CREATE TRIGGER update_trainer_availability_updated_at
BEFORE UPDATE ON public.trainer_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();