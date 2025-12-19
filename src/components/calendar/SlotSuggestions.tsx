import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SlotSuggestion {
  start: Date;
  end: Date;
}

interface SlotSuggestionsProps {
  slots: SlotSuggestion[];
  onSelect: (slot: SlotSuggestion) => void;
  className?: string;
}

export function SlotSuggestions({ slots, onSelect, className }: SlotSuggestionsProps) {
  if (slots.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Navrhované volné časy:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot, index) => (
          <Button
            key={index}
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => onSelect(slot)}
          >
            <Clock className="w-3 h-3" />
            {format(slot.start, 'HH:mm')} – {format(slot.end, 'HH:mm')}
          </Button>
        ))}
      </div>
    </div>
  );
}
