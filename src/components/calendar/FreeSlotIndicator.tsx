import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreeSlotIndicatorProps {
  startTime: Date;
  endTime: Date;
  onClick?: () => void;
  compact?: boolean;
}

export function FreeSlotIndicator({ startTime, endTime, onClick, compact = false }: FreeSlotIndicatorProps) {
  if (compact) {
    return (
      <div 
        className="flex items-center justify-center py-1 border-t border-dashed border-success/30"
        onClick={onClick}
      >
        <span className="text-[10px] text-success/60">
          Volno {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg p-3 mb-2 transition-all',
        'border border-dashed border-success/40 bg-success/5',
        'hover:bg-success/10 hover:border-success/60',
        'flex items-center justify-between gap-2',
        'group cursor-pointer'
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-success/40" />
        <span className="text-sm text-success/70 font-medium">
          Volno
        </span>
        <span className="text-xs text-muted-foreground">
          {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
        </span>
      </div>
      <Plus className="w-4 h-4 text-success/50 group-hover:text-success transition-colors" />
    </button>
  );
}
