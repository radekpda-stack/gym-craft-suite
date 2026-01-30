import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Dumbbell, 
  Bike, 
  Waves, 
  MoveHorizontal, 
  Footprints,
  Sparkles,
  User,
  MessageCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { useState } from 'react';

// Simple workout type icons
const WORKOUT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  strength: Dumbbell,
  cardio: Bike,
  run: Footprints,
  mobility: MoveHorizontal,
  swimming: Waves,
  other: Sparkles,
  hiit: Sparkles,
  recovery: MoveHorizontal,
  conditioning: Bike,
  // New machine types
  rowing: Waves,
  skierg: MoveHorizontal,
  treadmill_motor: Footprints,
  treadmill_curved: Footprints,
  jumprope: Sparkles,
  cycling: Bike,
  walk: Footprints,
};

const WORKOUT_COLORS: Record<string, string> = {
  strength: 'text-warning bg-warning/10',
  cardio: 'text-accent bg-accent/10',
  run: 'text-success bg-success/10',
  mobility: 'text-primary bg-primary/10',
  swimming: 'text-accent bg-accent/10',
  other: 'text-primary bg-primary/10',
  hiit: 'text-destructive bg-destructive/10',
  recovery: 'text-success bg-success/10',
  conditioning: 'text-warning bg-warning/10',
  // New machine types
  rowing: 'text-accent bg-accent/10',
  skierg: 'text-accent bg-accent/10',
  treadmill_motor: 'text-success bg-success/10',
  treadmill_curved: 'text-success bg-success/10',
  jumprope: 'text-warning bg-warning/10',
  cycling: 'text-accent bg-accent/10',
  walk: 'text-accent bg-accent/10',
};

const FEELING_EMOJIS = ['', '😩', '😕', '😐', '😊', '🔥'];

interface SimpleWorkoutCardProps {
  entry: UnifiedDiaryEntry;
  onDelete?: () => void;
}

export function SimpleWorkoutCard({ entry, onDelete }: SimpleWorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const Icon = WORKOUT_ICONS[entry.workout_type || 'other'] || Sparkles;
  const colorClass = WORKOUT_COLORS[entry.workout_type || 'other'] || WORKOUT_COLORS.other;
  const feelingEmoji = entry.energy_after ? FEELING_EMOJIS[entry.energy_after] : '';
  
  const hasTrainerComment = !!entry.trainer_comment;
  const hasNotes = !!entry.notes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden">
        <div
          className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              entry.is_coached ? "bg-primary/10 text-primary" : colorClass
            )}>
              {entry.is_coached ? (
                <User className="w-6 h-6" />
              ) : (
                <Icon className="w-6 h-6" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {format(parseISO(entry.date), 'EEEE', { locale: cs })}
                </span>
                <span className="text-muted-foreground text-sm">
                  {format(parseISO(entry.date), 'd. M.', { locale: cs })}
                </span>
                {entry.is_coached && (
                  <Badge variant="secondary" className="text-xs">
                    S trenérem
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {entry.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {entry.duration_minutes} min
                  </span>
                )}
                {feelingEmoji && (
                  <span className="text-lg">{feelingEmoji}</span>
                )}
                {hasTrainerComment && (
                  <span className="flex items-center gap-1 text-primary">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Komentář
                  </span>
                )}
              </div>
            </div>

            {/* Expand indicator */}
            <div className="flex items-center gap-2">
              {onDelete && !entry.is_coached && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {(hasNotes || hasTrainerComment) && (
                expanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )
              )}
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (hasNotes || hasTrainerComment) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 space-y-3 border-t pt-3">
                {/* Client notes */}
                {hasNotes && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="text-muted-foreground">{entry.notes}</p>
                  </div>
                )}

                {/* Trainer comment */}
                {hasTrainerComment && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Trenér</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{entry.trainer_comment}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
