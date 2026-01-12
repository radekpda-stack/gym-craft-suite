import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  ChevronDown, 
  ChevronUp,
  Clock,
  Target,
  MessageSquare,
  Trophy,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from './WorkoutTypeSelector';
import { getEnergyEmoji } from './EnergyRating';

interface WorkoutListItemProps {
  entry: UnifiedDiaryEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRepeat: () => void;
  onSaveAsTemplate: () => void;
}

export function WorkoutListItem({
  entry,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onRepeat,
  onSaveAsTemplate,
}: WorkoutListItemProps) {
  const exerciseCount = entry.exercises?.length || 0;
  const WorkoutIcon = getWorkoutTypeIcon(entry.workout_type);
  const hasPR = entry.exercises?.some(ex => ex.is_personal_record || ex.is_pr);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
      case 'draft':
        return <Badge variant="outline" className="text-warning border-warning/50 bg-warning/10">Naplánovaný</Badge>;
      case 'completed':
      case 'reviewed':
        return <Badge variant="outline" className="text-success border-success/50 bg-success/10">Hotovo</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden">
        <div
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                entry.is_coached 
                  ? "bg-primary/10 text-primary" 
                  : "bg-success/10 text-success"
              )}>
                {entry.is_coached ? (
                  <User className="w-5 h-5" />
                ) : (
                  <WorkoutIcon className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {format(parseISO(entry.date), 'EEEE d. MMMM', { locale: cs })}
                  </span>
                  <Badge 
                    variant={entry.is_coached ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {entry.is_coached ? 'S trenérem' : 'Samostatně'}
                  </Badge>
                  {getStatusBadge(entry.status)}
                  {hasPR && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Trophy className="w-3 h-3" /> PR
                    </Badge>
                  )}
                  {entry.tags && entry.tags.length > 0 && entry.tags.map((tag) => (
                    <Badge 
                      key={tag.id}
                      variant="outline"
                      className="text-xs"
                      style={{ 
                        borderColor: tag.color,
                        backgroundColor: `${tag.color}15`,
                        color: tag.color 
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{getWorkoutTypeLabel(entry.workout_type)}</span>
                  {exerciseCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{exerciseCount} cviků</span>
                    </>
                  )}
                  {entry.duration_minutes && (
                    <>
                      <span>•</span>
                      <span>{entry.duration_minutes} min</span>
                    </>
                  )}
                  {(entry.energy_before || entry.energy_after) && (
                    <>
                      <span>•</span>
                      <span>
                        {getEnergyEmoji(entry.energy_before)}→{getEnergyEmoji(entry.energy_after)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRepeat(); }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Opakovat trénink
                  </DropdownMenuItem>
                  {!entry.is_coached && (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSaveAsTemplate(); }}>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Uložit jako šablonu
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Upravit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Smazat
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 border-t pt-4 space-y-3">
                {entry.notes && (
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                    <span>{entry.notes}</span>
                  </div>
                )}

                {entry.exercises?.map((ex, idx) => (
                  <div
                    key={ex.id || idx}
                    className={cn(
                      "p-3 rounded-lg",
                      (ex.is_personal_record || ex.is_pr) ? "bg-warning/10 border border-warning/30" : "bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ex.exercise_name}</span>
                        {(ex.is_personal_record || ex.is_pr) && (
                          <Trophy className="w-4 h-4 text-warning" />
                        )}
                      </div>
                      {ex.rpe && (
                        <Badge variant="outline" className="text-xs">
                          RPE {ex.rpe}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {ex.sets && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" />
                          {ex.sets} sérií
                        </span>
                      )}
                      {ex.reps && (
                        <span>{ex.reps} opakování</span>
                      )}
                      {ex.weight_kg && (
                        <span className="font-medium text-foreground">
                          {ex.weight_kg} kg
                        </span>
                      )}
                      {ex.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.round(ex.duration_seconds / 60)} min
                        </span>
                      )}
                    </div>
                    {ex.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {ex.notes}
                      </p>
                    )}
                  </div>
                ))}

                {/* Trainer comment */}
                {entry.trainer_comment && (
                  <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                    <User className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <div className="font-medium text-primary mb-1">Komentář trenéra</div>
                      <span className="whitespace-pre-wrap">{entry.trainer_comment}</span>
                    </div>
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
