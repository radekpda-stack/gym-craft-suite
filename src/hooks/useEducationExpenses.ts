import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface EducationExpense {
  id: string;
  name: string;
  date: string;
  amount: number;
  description: string | null;
}

/**
 * Fetch education expenses (courses, certifications) to display on trainer profile
 */
export function useEducationExpenses() {
  return useQuery({
    queryKey: ['education-expenses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('business_expenses')
        .select('id, name, date, amount, description')
        .eq('user_id', user.id)
        .eq('category', 'education')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as EducationExpense[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get certification names from education expenses
 */
export function useCertificationsFromExpenses() {
  const { data: expenses, ...rest } = useEducationExpenses();
  
  const certifications = expenses?.map(expense => ({
    name: expense.name,
    year: format(new Date(expense.date), 'yyyy'),
    id: expense.id,
  })) || [];

  return { certifications, ...rest };
}
