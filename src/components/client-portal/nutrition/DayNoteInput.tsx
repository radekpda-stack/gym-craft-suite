/**
 * DayNoteInput - component for adding/editing day notes
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { MessageSquarePlus, Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayNoteInputProps {
  /** Current note value */
  currentNote: string | null;
  /** Called when note is saved */
  onSave: (note: string) => Promise<void>;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Label for the button */
  label?: string;
  /** Show as icon-only button */
  iconOnly?: boolean;
  /** Optional className */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

export function DayNoteInput({
  currentNote,
  onSave,
  isSaving = false,
  label = 'Poznámka dne',
  iconOnly = false,
  className,
  placeholder = 'Narozeniny, pracovní večeře, cestování...',
}: DayNoteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState(currentNote || '');

  const handleOpen = (open: boolean) => {
    if (open) {
      setNote(currentNote || '');
    }
    setIsOpen(open);
  };

  const handleSave = async () => {
    await onSave(note);
    setIsOpen(false);
  };

  const hasNote = !!currentNote;
  const Icon = hasNote ? Pencil : MessageSquarePlus;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', className)}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant={hasNote ? 'secondary' : 'outline'}
            size="sm"
            className={cn('gap-2', className)}
          >
            <Icon className="h-4 w-4" />
            {hasNote ? 'Upravit poznámku' : label}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            {label}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="resize-none"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            Přidej kontext pro trenéra - co ovlivnilo tvé stravování dnes?
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline display of a day note
 */
interface DayNoteDisplayProps {
  clientNote: string | null;
  trainerNote?: string | null;
  className?: string;
  onEditClient?: () => void;
}

export function DayNoteDisplay({
  clientNote,
  trainerNote,
  className,
  onEditClient,
}: DayNoteDisplayProps) {
  if (!clientNote && !trainerNote) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {clientNote && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">{clientNote}</p>
          </div>
          {onEditClient && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onEditClient}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      {trainerNote && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-xs">💬</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Trenér:</p>
            <p className="text-sm">{trainerNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}
