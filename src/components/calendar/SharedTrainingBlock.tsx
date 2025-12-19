import { format } from 'date-fns';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SharedTraining } from '@/hooks/useSharedTrainings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SharedTrainingBlockProps {
  training: SharedTraining;
}

export function SharedTrainingBlock({ training }: SharedTrainingBlockProps) {
  const sessionDate = new Date(training.date);
  const endTime = new Date(sessionDate.getTime() + training.duration * 60000);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'rounded-xl p-4 mb-2 cursor-default select-none',
              'bg-muted/30 border border-dashed border-muted-foreground/30',
              'opacity-60'
            )}
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--muted)/0.3) 10px, hsl(var(--muted)/0.3) 20px)'
            }}
          >
            <div className="flex items-start gap-3">
              {/* Time column */}
              <div className="flex-shrink-0 text-center min-w-[60px]">
                <p className="text-lg font-bold text-muted-foreground">
                  {format(sessionDate, 'HH:mm')}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  –{format(endTime, 'HH:mm')}
                </p>
              </div>

              {/* Divider */}
              <div className="w-px h-12 bg-muted-foreground/20 flex-shrink-0" />

              {/* Info column */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />
                <p className="text-sm text-muted-foreground font-medium">
                  Obsazeno – jiný trenér
                </p>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Obsazeno – trénink jiného trenéra</p>
          <p className="text-xs text-muted-foreground">
            {format(sessionDate, 'HH:mm')} – {format(endTime, 'HH:mm')} ({training.duration} min)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
