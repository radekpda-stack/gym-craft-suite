import { useUndo } from '@/contexts/UndoContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for registering undo actions for credit transactions
 */
export function useUndoTransaction() {
  const { registerUndo } = useUndo();
  const queryClient = useQueryClient();

  const registerTransactionUndo = (
    transaction: { id: string; amount: number; client_id: string },
    label: string,
    description?: string
  ) => {
    registerUndo({
      label,
      description,
      category: 'credit',
      undoFn: async () => {
        // Delete the transaction
        const { error: deleteError } = await supabase
          .from('credit_transactions')
          .delete()
          .eq('id', transaction.id);

        if (deleteError) throw deleteError;

        // Trigger fn_sync_client_credit_balance automatically recalculates
        // balance from SUM(amount) after DELETE. No manual delta needed.

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['shared_budget_balance'] });
        queryClient.invalidateQueries({ queryKey: ['budget_groups'] });

        toast({
          title: 'Akce vrácena',
          description: 'Transakce byla zrušena.',
        });
      },
    });
  };

  return { registerTransactionUndo };
}

/**
 * Hook for registering undo actions for training session deletions
 */
export function useUndoTrainingDelete() {
  const { registerUndo } = useUndo();
  const queryClient = useQueryClient();

  const registerTrainingDeleteUndo = (
    trainingData: {
      client_id: string;
      date: string;
      duration: number;
      notes: string;
      status: string;
      participant_count: number;
      training_type?: string | null;
      training_goal?: string | null;
      prep_notes?: string | null;
    },
    label: string
  ) => {
    registerUndo({
      label,
      category: 'training',
      undoFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Recreate the training session
        const { error } = await supabase
          .from('training_sessions')
          .insert({
            client_id: trainingData.client_id,
            date: trainingData.date,
            duration: trainingData.duration,
            notes: trainingData.notes,
            status: trainingData.status,
            participant_count: trainingData.participant_count,
            training_type: trainingData.training_type,
            training_goal: trainingData.training_goal,
            prep_notes: trainingData.prep_notes,
            user_id: user.id,
          });

        if (error) throw error;

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['training_sessions'] });

        toast({
          title: 'Akce vrácena',
          description: 'Trénink byl obnoven.',
        });
      },
    });
  };

  return { registerTrainingDeleteUndo };
}

/**
 * Hook for registering undo actions for training completion (credit deduction)
 */
export function useUndoTrainingComplete() {
  const { registerUndo } = useUndo();
  const queryClient = useQueryClient();

  const registerTrainingCompleteUndo = (
    trainingId: string,
    clientId: string,
    transactionId: string,
    price: number,
    label: string
  ) => {
    registerUndo({
      label,
      description: `Kredit ${price} Kč bude vrácen`,
      category: 'training',
      undoFn: async () => {
        // Revert training status to scheduled
        const { error: trainingError } = await supabase
          .from('training_sessions')
          .update({
            status: 'scheduled',
            payment_status: 'pending',
            final_price: null,
            payment_method: null,
          })
          .eq('id', trainingId);

        if (trainingError) throw trainingError;

        // Delete the credit transaction
        const { error: deleteError } = await supabase
          .from('credit_transactions')
          .delete()
          .eq('id', transactionId);

        if (deleteError) throw deleteError;

        // Trigger fn_sync_client_credit_balance automatically recalculates
        // balance from SUM(amount) after DELETE. No manual delta needed.

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['training_sessions'] });
        queryClient.invalidateQueries({ queryKey: ['training_session', trainingId] });
        queryClient.invalidateQueries({ queryKey: ['credit_transactions'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['shared_budget_balance'] });

        toast({
          title: 'Akce vrácena',
          description: `Trénink vrácen do stavu Naplánováno, kredit ${price} Kč vrácen.`,
        });
      },
    });
  };

  return { registerTrainingCompleteUndo };
}
