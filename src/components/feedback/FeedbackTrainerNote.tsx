/**
 * FeedbackTrainerNote - Inline editor for private trainer notes on feedback
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FeedbackTrainerNoteProps {
  feedbackId: string;
  initialNote?: string | null;
  onClose?: () => void;
  compact?: boolean;
}

export function FeedbackTrainerNote({
  feedbackId,
  initialNote,
  onClose,
  compact = false,
}: FeedbackTrainerNoteProps) {
  const [note, setNote] = useState(initialNote || '');
  const [isEditing, setIsEditing] = useState(!initialNote);
  const queryClient = useQueryClient();

  const saveNote = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('training_feedback')
        .update({ trainer_note: noteText || null })
        .eq('id', feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-overview'] });
      queryClient.invalidateQueries({ queryKey: ['training-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['client-feedback'] });
      toast.success('Poznámka uložena');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Nepodařilo se uložit poznámku');
    },
  });

  const handleSave = () => {
    saveNote.mutate(note);
  };

  const handleCancel = () => {
    setNote(initialNote || '');
    setIsEditing(false);
    onClose?.();
  };

  return (
    <div className={cn(
      'bg-secondary/50 rounded-lg border border-border p-3',
      compact && 'p-2'
    )}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          📝 Trenérská poznámka
        </p>
        <span className="text-[10px] text-muted-foreground">
          Privátní - klient nevidí
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Poznámky k feedbacku, co je třeba řešit..."
            rows={compact ? 2 : 3}
            className="text-sm resize-none bg-background"
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {note.length}/500
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={saveNote.isPending}
                className="h-7 px-2 text-xs"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Zrušit
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveNote.isPending}
                className="h-7 px-3 text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                Uložit
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded bg-background/50 hover:bg-background"
        >
          {note || 'Přidat poznámku...'}
        </button>
      )}
    </div>
  );
}
