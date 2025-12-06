-- Create client_budget_groups table for linking clients to shared budgets
CREATE TABLE public.client_budget_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create client_budget_members table for group membership
CREATE TABLE public.client_budget_members (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid NOT NULL REFERENCES public.client_budget_groups(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_id uuid NOT NULL,
    UNIQUE(group_id, client_id)
);

-- Enable RLS
ALTER TABLE public.client_budget_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_budget_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_budget_groups
CREATE POLICY "Users can view their own budget groups" 
ON public.client_budget_groups FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget groups" 
ON public.client_budget_groups FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget groups" 
ON public.client_budget_groups FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget groups" 
ON public.client_budget_groups FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for client_budget_members
CREATE POLICY "Users can view their own budget members" 
ON public.client_budget_members FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget members" 
ON public.client_budget_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget members" 
ON public.client_budget_members FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_client_budget_groups_updated_at
BEFORE UPDATE ON public.client_budget_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();