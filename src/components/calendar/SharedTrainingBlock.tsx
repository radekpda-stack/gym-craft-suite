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
  
  const trainerName = training.trainer?.display_name || training.trainer?.email?.split('@')[0] || 'Trenér';
  const trainerColor = training.trainer?.color || 'hsl(var(--muted-foreground))';
  
  // Get initials for avatar
  const initials = trainerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'rounded-xl p-4 mb-2 cursor-default select-none relative overflow-hidden',
              'bg-muted/20 border-2 border-dashed'
            )}
            style={{
              borderColor: trainerColor,
            }}
          >
            {/* Colored left accent bar */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
              style={{ backgroundColor: trainerColor }}
            />
            
            <div className="flex items-start gap-3 pl-2">
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
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {/* Trainer avatar with color */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: trainerColor }}
                >
                  {initials}
                </div>
                
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground/80 truncate">
                    {trainerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Obsazeno
                  </p>
                </div>
              </div>

              {/* Duration badge */}
              <div className="flex-shrink-0">
                <span 
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ 
                    backgroundColor: `${trainerColor}20`,
                    color: trainerColor 
                  }}
                >
                  {training.duration} min
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: trainerColor }}
              />
              <p className="font-medium">{trainerName}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(sessionDate, 'HH:mm')} – {format(endTime, 'HH:mm')} ({training.duration} min)
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
