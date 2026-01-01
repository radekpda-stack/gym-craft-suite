import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAllClientWorkoutLogs, useAddTrainerComment } from '@/hooks/useClientWorkoutLogs';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { BookOpen, Search, ChevronDown, ChevronUp, User, MessageSquare, Send, Trophy, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from './workout-diary/WorkoutTypeSelector';
import { getEnergyEmoji } from './workout-diary/EnergyRating';

export function ClientWorkoutLogsOverview() {
  const { data: logs, isLoading } = useAllClientWorkoutLogs();
  const addComment = useAddTrainerComment();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [commentingLogId, setCommentingLogId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

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

  const filteredLogs = logs?.filter(log => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return log.client?.name?.toLowerCase().includes(query) ||
      log.exercises?.some(ex => ex.exercise_name.toLowerCase().includes(query));
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Tréninkové deníky klientů
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Tréninkové deníky klientů
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Záznamy tréninků od klientů s možností komentáře
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat podle jména klienta nebo cviku..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredLogs?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Zatím žádné záznamy od klientů</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs?.map(log => {
              const isExpanded = expandedLogs.has(log.id);
              const exerciseCount = log.exercises?.length || 0;
              const WorkoutIcon = getWorkoutTypeIcon(log.workout_type);
              const hasPR = log.exercises?.some(ex => ex.is_personal_record);

              return (
                <div key={log.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleLogExpanded(log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center", getWorkoutTypeColor(log.workout_type))}>
                          <WorkoutIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.client?.name || 'Klient'}</span>
                            {hasPR && <Badge variant="secondary" className="text-xs gap-1"><Trophy className="w-3 h-3" />PR</Badge>}
                            {log.trainer_comment && <MessageSquare className="w-4 h-4 text-primary" />}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{format(parseISO(log.date), 'd. MMMM', { locale: cs })}</span>
                            <span>•</span>
                            <span>{getWorkoutTypeLabel(log.workout_type)}</span>
                            <span>•</span>
                            <span>{exerciseCount} cviků</span>
                            {log.duration_minutes && <><span>•</span><span>{log.duration_minutes} min</span></>}
                            {(log.energy_before || log.energy_after) && (
                              <span>{getEnergyEmoji(log.energy_before)}→{getEnergyEmoji(log.energy_after)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true, locale: cs })}
                        </Badge>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div className="px-4 pb-4 border-t pt-3 space-y-2">
                          {log.notes && <p className="text-sm text-muted-foreground italic mb-3">{log.notes}</p>}
                          
                          {log.exercises?.map((ex, idx) => (
                            <div key={ex.id || idx} className={cn("p-2 rounded text-sm", ex.is_personal_record ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-secondary/30")}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium flex items-center gap-2">
                                  {ex.exercise_name}
                                  {ex.is_personal_record && <Trophy className="w-3 h-3 text-yellow-500" />}
                                </span>
                                {ex.rpe && <Badge variant="secondary">RPE {ex.rpe}</Badge>}
                              </div>
                              <div className="flex gap-3 text-muted-foreground mt-1">
                                {ex.sets && <span>{ex.sets}×{ex.reps || '?'}</span>}
                                {ex.weight_kg && <span className="font-medium text-foreground">{ex.weight_kg} kg</span>}
                                {ex.duration_seconds && <span>{Math.round(ex.duration_seconds / 60)} min</span>}
                              </div>
                            </div>
                          ))}

                          {/* Trainer comment section */}
                          {log.trainer_comment ? (
                            <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                              <div className="font-medium text-primary mb-1">Váš komentář</div>
                              <p>{log.trainer_comment}</p>
                            </div>
                          ) : commentingLogId === log.id ? (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                placeholder="Napište komentář pro klienta..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAddComment(log.id)} disabled={addComment.isPending}>
                                  <Send className="w-4 h-4 mr-1" />Odeslat
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setCommentingLogId(null)}>Zrušit</Button>
                              </div>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="mt-3" onClick={(e) => { e.stopPropagation(); setCommentingLogId(log.id); }}>
                              <MessageSquare className="w-4 h-4 mr-2" />Přidat komentář
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
