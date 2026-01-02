import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useClientWorkoutLogs, useAddTrainerComment } from '@/hooks/useClientWorkoutLogs';
import { useReviewWorkout } from '@/hooks/useAssignWorkout';
import { AssignWorkoutDialog } from './AssignWorkoutDialog';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Send, 
  Trophy, 
  CalendarPlus,
  CheckCircle2,
  Dumbbell 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from '@/components/client-portal/workout-diary/WorkoutTypeSelector';
import { getEnergyEmoji } from '@/components/client-portal/workout-diary/EnergyRating';

interface ClientWorkoutDiaryProps {
  clientId: string;
  clientName: string;
}

export function ClientWorkoutDiary({ clientId, clientName }: ClientWorkoutDiaryProps) {
  const { data: logs, isLoading } = useClientWorkoutLogs(clientId);
  const addComment = useAddTrainerComment();
  const reviewWorkout = useReviewWorkout();
  
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [commentingLogId, setCommentingLogId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      next.has(logId) ? next.delete(logId) : next.add(logId);
      return next;
    });
  };

  const handleAddComment = async (logId: string) => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync({ logId, comment: commentText.trim() });
    setCommentText('');
    setCommentingLogId(null);
  };

  const handleReview = async (logId: string, withComment?: boolean) => {
    await reviewWorkout.mutateAsync({
      logId,
      clientId,
      comment: withComment ? commentText.trim() : undefined,
    });
    setCommentText('');
    setCommentingLogId(null);
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'planned':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 bg-yellow-500/10">Plánovaný</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-500/50 bg-green-500/10">Dokončený</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="text-primary border-primary/50 bg-primary/10">Zkontrolován</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Tréninkový deník
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Tréninkový deník
          </CardTitle>
          <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
            <CalendarPlus className="w-4 h-4 mr-2" />
            Naplánovat
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Klient zatím nemá žádné záznamy</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setAssignDialogOpen(true)}
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Naplánovat první trénink
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 10).map(log => {
                const isExpanded = expandedLogs.has(log.id);
                const exerciseCount = log.exercises?.length || 0;
                const WorkoutIcon = getWorkoutTypeIcon(log.workout_type);
                const hasPR = log.exercises?.some(ex => ex.is_personal_record);

                return (
                  <div key={log.id} className="border rounded-lg overflow-hidden">
                    <div
                      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleLogExpanded(log.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", getWorkoutTypeColor(log.workout_type))}>
                            <WorkoutIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {format(parseISO(log.date), 'd. MMMM', { locale: cs })}
                              </span>
                              {hasPR && <Badge variant="secondary" className="text-xs gap-1"><Trophy className="w-3 h-3" />PR</Badge>}
                              {getStatusBadge((log as any).status)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{getWorkoutTypeLabel(log.workout_type)}</span>
                              <span>•</span>
                              <span>{exerciseCount} cviků</span>
                              {log.duration_minutes && <><span>•</span><span>{log.duration_minutes} min</span></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {log.trainer_comment && <MessageSquare className="w-4 h-4 text-primary" />}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <div className="px-3 pb-3 border-t pt-3 space-y-2">
                            {log.notes && <p className="text-sm text-muted-foreground italic">{log.notes}</p>}
                            
                            {log.exercises?.map((ex, idx) => (
                              <div key={ex.id || idx} className={cn("p-2 rounded text-sm", ex.is_personal_record ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-secondary/30")}>
                                <div className="flex items-center justify-between">
                                  <span className="font-medium flex items-center gap-2">
                                    {ex.exercise_name}
                                    {ex.is_personal_record && <Trophy className="w-3 h-3 text-yellow-500" />}
                                  </span>
                                  {ex.rpe && <Badge variant="secondary" className="text-xs">RPE {ex.rpe}</Badge>}
                                </div>
                                <div className="flex gap-3 text-muted-foreground mt-1 text-xs">
                                  {ex.sets && <span>{ex.sets}×{ex.reps || '?'}</span>}
                                  {ex.weight_kg && <span className="font-medium text-foreground">{ex.weight_kg} kg</span>}
                                  {ex.duration_seconds && <span>{Math.round(ex.duration_seconds / 60)} min</span>}
                                </div>
                              </div>
                            ))}

                            {/* Trainer comment section */}
                            {log.trainer_comment ? (
                              <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                                <div className="font-medium text-primary text-xs mb-1">Váš komentář</div>
                                <p className="text-sm">{log.trainer_comment}</p>
                              </div>
                            ) : commentingLogId === log.id ? (
                              <div className="mt-2 space-y-2">
                                <Textarea
                                  placeholder="Napište komentář pro klienta..."
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  rows={2}
                                />
                                <div className="flex gap-2 flex-wrap">
                                  <Button size="sm" onClick={() => handleReview(log.id, true)} disabled={reviewWorkout.isPending}>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />Zkontrolovat
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleAddComment(log.id)} disabled={addComment.isPending}>
                                    <Send className="w-4 h-4 mr-1" />Komentář
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setCommentingLogId(null)}>Zrušit</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2 mt-2">
                                {(log as any).status !== 'reviewed' && (
                                  <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); handleReview(log.id); }} disabled={reviewWorkout.isPending}>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />Zkontrolovat
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setCommentingLogId(log.id); }}>
                                  <MessageSquare className="w-4 h-4 mr-1" />Komentář
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              
              {logs.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  + {logs.length - 10} dalších záznamů
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignWorkoutDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </>
  );
}
