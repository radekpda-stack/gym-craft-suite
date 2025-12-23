-- Opravit příliš permisivní RLS policy na profiles tabulce
-- Původní policy "Users can view all profiles" povoluje čtení všech profilů

-- 1. Smazat starou příliš permisivní policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2. Vytvořit novou policy - uživatel vidí pouze svůj vlastní profil
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);