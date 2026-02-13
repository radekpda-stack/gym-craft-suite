import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ExpenseCategory = 
  | 'rent' 
  | 'inventory'
  | 'equipment' 
  | 'education' 
  | 'marketing' 
  | 'software' 
  | 'transport' 
  | 'insurance' 
  | 'other';

export type RecurringInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface BusinessExpense {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount: number;
  date: string;
  category: ExpenseCategory;
  is_recurring: boolean;
  recurring_interval: RecurringInterval | null;
  recurring_end_date: string | null;
  parent_expense_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  name: string;
  description?: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  is_recurring?: boolean;
  recurring_interval?: RecurringInterval;
  recurring_end_date?: string;
  notes?: string;
  receipt_url?: string;
}

export interface ExpenseFilters {
  period?: 'month' | 'quarter' | 'year' | 'all';
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'rent', label: 'Nájem / Provize', icon: '🏢' },
  { value: 'inventory', label: 'Nákup zboží', icon: '📦' },
  { value: 'equipment', label: 'Vybavení', icon: '🏋️' },
  { value: 'education', label: 'Vzdělávání', icon: '📚' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'software', label: 'Software / Licence', icon: '💻' },
  { value: 'transport', label: 'Doprava', icon: '🚗' },
  { value: 'insurance', label: 'Pojištění', icon: '🛡️' },
  { value: 'other', label: 'Ostatní', icon: '📦' },
];

export function getCategoryInfo(category: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[7];
}

/**
 * Fetch business expenses with optional filters
 */
export function useBusinessExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: ['business-expenses', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('business_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Apply date filters
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      // Period filter
      if (filters?.period && !filters.startDate && !filters.endDate) {
        const now = new Date();
        let startDate: string;
        
        switch (filters.period) {
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            break;
          case 'quarter':
            const quarterStart = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStart, 1).toISOString().split('T')[0];
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            break;
          default:
            startDate = '';
        }
        
        if (startDate) {
          query = query.gte('date', startDate);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data as BusinessExpense[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create a new expense
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseData: CreateExpenseData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('business_expenses')
        .insert({
          user_id: user.id,
          ...expenseData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profit-by-period'] });
      queryClient.invalidateQueries({ queryKey: ['annual-stats'] });
      queryClient.invalidateQueries({ queryKey: ['period-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['unified-financial-data'] });
      toast({
        title: 'Náklad přidán',
        description: 'Náklad byl úspěšně zaznamenán.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přidat náklad.',
        variant: 'destructive',
      });
      console.error('Create expense error:', error);
    },
  });
}

/**
 * Update an existing expense
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<CreateExpenseData> & { id: string }) => {
      const { data, error } = await supabase
        .from('business_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profit-by-period'] });
      queryClient.invalidateQueries({ queryKey: ['annual-stats'] });
      queryClient.invalidateQueries({ queryKey: ['period-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['unified-financial-data'] });
      toast({
        title: 'Náklad upraven',
        description: 'Změny byly uloženy.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se upravit náklad.',
        variant: 'destructive',
      });
      console.error('Update expense error:', error);
    },
  });
}

/**
 * Delete an expense
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['profit-by-period'] });
      queryClient.invalidateQueries({ queryKey: ['annual-stats'] });
      queryClient.invalidateQueries({ queryKey: ['period-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['unified-financial-data'] });
      toast({
        title: 'Náklad smazán',
        description: 'Náklad byl odstraněn.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se smazat náklad.',
        variant: 'destructive',
      });
      console.error('Delete expense error:', error);
    },
  });
}
