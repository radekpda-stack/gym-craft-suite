/**
 * ClientSelfWorkoutsCard Component
 * 
 * Shows workouts logged by the client themselves (outside trainer sessions).
 * Displays in the Trainings tab of client detail.
 */
import { useState } from 'react';
import { 
  Dumbbell, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Calendar as CalendarIcon,
  Zap,
  Trophy,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useClientWorkoutLogs, useAddTrainerComment, WorkoutLog } from '@/hooks/useClientWorkoutLogs';

interface ClientSelfWorkoutsCardProps {
  clientId: string;
  defaultOpen?: boolean;
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  strength: 'Silový',
  cardio: 'Kardio',
  hiit: 'HIIT',
  mobility: 'Mobilita',
  crossfit: 'CrossFit',
  other: 'Ostatní',
};

const WORKOUT_TYPE_ICONS: Record<string, string> = {
  strength: '💪',
  cardio: '🏃',
  hiit: '⚡',
  mobility: '🧘',
  crossfit: '🏋️',
  other: '🎯',
};

function WorkoutLogItem({ log, onComment }: { log: WorkoutLog; onComment: (logId: string, comment: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [commentText, setCommentText] = useState(log.trainer_comment || '');
  const [isEditing, setIsEditing] = useState(false);
  
  const typeLabel = WORKOUT_TYPE_LABELS[log.workout_type || 'other'] || log.workout_type || 'Trénink';
  const typeIcon = WORKOUT_TYPE_ICONS[log.workout_type || 'other'] || '🎯';
  const exercises = log.exercises || [];
  const prCount = exercises.filter(e => e.is_personal_record).length;
  
  const handleSaveComment = () => {
    onComment(log.id, commentText);
    setIsEditing(false);
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
            {/* Icon */}
            <div className="text-xl">{typeIcon}</div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{typeLabel}</span>
                {prCount > 0 && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0">
                    <Trophy className="w-3 h-3 mr-0.5" />
                    {prCount} PR
                  </Badge>
                )}
                {log.trainer_comment && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    <MessageSquare className="w-3 h-3 mr-0.5" />
                    Okomentováno
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {format(new Date(log.date), 'd. M. yyyy', { locale: cs })}
                </span>
                {log.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.duration_minutes} min
                  </span>
                )}
                {log.calories_burned && (
                  <span className="flex items-center gap-1 text-orange-500">
                    <Flame className="w-3 h-3" />
                    {log.calories_burned} kcal
                  </span>
                )}
                {(log.energy_before || log.energy_after) && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {log.energy_before || '?'} → {log.energy_after || '?'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Expand icon */}
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
            {/* Exercises */}
            {exercises.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Cviky ({exercises.length})
                </h4>
                <div className="space-y-1">
                  {exercises.map((ex, idx) => (
                    <div 
                      key={ex.id || idx} 
                      className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs w-5">{idx + 1}.</span>
                        <span className="font-medium">{ex.exercise_name}</span>
                        {ex.is_personal_record && (
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        {ex.side && ex.side !== 'none' && ex.side !== 'both' && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {ex.side === 'left' ? 'L' : 'R'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {ex.sets && ex.reps && (
                          <span>{ex.sets}×{ex.reps}</span>
                        )}
                        {ex.weight_kg && (
                          <span>@ {ex.weight_kg} kg</span>
                        )}
                        {ex.duration_seconds && (
                          <span>{Math.floor(ex.duration_seconds / 60)}:{String(ex.duration_seconds % 60).padStart(2, '0')}</span>
                        )}
                        {ex.distance_meters && (
                          <span>{ex.distance_meters >= 1000 ? `${(ex.distance_meters / 1000).toFixed(1)} km` : `${ex.distance_meters} m`}</span>
                        )}
                        {ex.rpe && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            RPE {ex.rpe}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Client notes */}
            {log.notes && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Poznámky klienta
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                  {log.notes}
                </p>
              </div>
            )}
            
            {/* Trainer comment */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Komentář trenéra
              </h4>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Napište komentář k tréninku klienta..."
                    className="text-sm min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveComment}>
                      Uložit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : log.trainer_comment ? (
                <div 
                  className="text-sm bg-primary/5 border border-primary/20 p-2 rounded cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => setIsEditing(true)}
                >
                  <p>{log.trainer_comment}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {log.trainer_commented_at && formatDistanceToNow(new Date(log.trainer_commented_at), { addSuffix: true, locale: cs })}
                  </p>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsEditing(true)}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Přidat komentář
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ClientSelfWorkoutsCard({ clientId, defaultOpen = true }: ClientSelfWorkoutsCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { data: logs, isLoading } = useClientWorkoutLogs(clientId);
  const addComment = useAddTrainerComment();
  
  const handleComment = (logId: string, comment: string) => {
    addComment.mutate({ logId, comment });
  };
  
  const hasLogs = logs && logs.length > 0;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                Vlastní tréninky klienta
                {hasLogs && (
                  <Badge variant="secondary" className="text-xs">
                    {logs.length}
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !hasLogs ? (
              <div className="text-center py-6 text-muted-foreground">
                <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Klient zatím nezapsal žádný vlastní trénink</p>
                <p className="text-xs mt-1">
                  Záznamy se zde zobrazí, když klient použije klientský portál
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <WorkoutLogItem 
                    key={log.id} 
                    log={log} 
                    onComment={handleComment}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
