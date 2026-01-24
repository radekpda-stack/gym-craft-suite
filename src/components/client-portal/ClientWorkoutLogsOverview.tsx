import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllClientWorkoutLogs, useAddTrainerComment } from '@/hooks/useClientWorkoutLogs';
import { useReviewWorkout } from '@/hooks/useAssignWorkout';
import { format, parseISO, formatDistanceToNow, isThisWeek } from 'date-fns';
import { cs } from 'date-fns/locale';
import { BookOpen, Search, ChevronDown, ChevronUp, MessageSquare, Send, Trophy, CheckCircle2, Filter, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from './workout-diary/WorkoutTypeSelector';
import { getEnergyEmoji } from './workout-diary/EnergyRating';

type FilterValue = 'all' | 'to_review' | 'with_pr' | 'this_week';
type SortValue = 'newest' | 'oldest' | 'client_name';

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Vše' },
  { value: 'to_review', label: 'Ke kontrole' },
  { value: 'with_pr', label: 'S PR' },
  { value: 'this_week', label: 'Tento týden' },
];

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'newest', label: 'Nejnovější' },
  { value: 'oldest', label: 'Nejstarší' },
  { value: 'client_name', label: 'Jméno klienta' },
];

export function ClientWorkoutLogsOverview() {
  const { data: logs, isLoading } = useAllClientWorkoutLogs();
  const addComment = useAddTrainerComment();
  const reviewWorkout = useReviewWorkout();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [commentingLogId, setCommentingLogId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [sort, setSort] = useState<SortValue>('newest');

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      next.has(logId) ? next.delete(logId) : next.add(logId);
      return next;
    });
  };

  const handleAddComment = async (logId: string, clientId: string) => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync({ logId, comment: commentText.trim() });
    setCommentText('');
    setCommentingLogId(null);
  };

  const handleReview = async (logId: string, clientId: string, withComment?: boolean) => {
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
        return <Badge variant="outline" className="text-warning border-warning/50 bg-warning/10">Plánovaný</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-success border-success/50 bg-success/10">Dokončený</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="text-primary border-primary/50 bg-primary/10">Zkontrolován</Badge>;
      default:
        return null;
    }
  };

  // Count logs needing review
  const toReviewCount = useMemo(() => {
    return logs?.filter(log => (log as any).status !== 'reviewed' && (log as any).status !== 'planned').length || 0;
  }, [logs]);

  // Filter and sort logs
  const processedLogs = useMemo(() => {
    if (!logs) return [];

    let filtered = logs.filter(log => {
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          log.client?.name?.toLowerCase().includes(query) ||
          log.exercises?.some(ex => ex.exercise_name.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Filter logic
      switch (filter) {
        case 'to_review':
          return (log as any).status !== 'reviewed' && (log as any).status !== 'planned';
        case 'with_pr':
          return log.exercises?.some(ex => ex.is_personal_record);
        case 'this_week':
          return isThisWeek(parseISO(log.date), { weekStartsOn: 1 });
        default:
          return true;
      }
    });

    // Sort
    switch (sort) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'client_name':
        filtered.sort((a, b) => (a.client?.name || '').localeCompare(b.client?.name || '', 'cs'));
        break;
    }

    return filtered;
  }, [logs, searchQuery, filter, sort]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Tréninkové deníky klientů
              {toReviewCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {toReviewCount} ke kontrole
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Záznamy tréninků od klientů s možností komentáře
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat podle jména klienta nebo cviku..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2 opacity-50" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.value === 'to_review' && toReviewCount > 0 && ` (${toReviewCount})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
              <SelectTrigger className="w-[130px]">
                <ArrowUpDown className="w-4 h-4 mr-2 opacity-50" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {processedLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{filter !== 'all' || searchQuery ? 'Žádné záznamy neodpovídají filtru' : 'Zatím žádné záznamy od klientů'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {processedLogs.map(log => {
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
                            {getStatusBadge((log as any).status)}
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
                            <div key={ex.id || idx} className={cn("p-2 rounded text-sm", ex.is_personal_record ? "bg-warning/10 border border-warning/30" : "bg-secondary/30")}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium flex items-center gap-2">
                                  {ex.exercise_name}
                                  {ex.is_personal_record && <Trophy className="w-3 h-3 text-warning" />}
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
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" onClick={() => handleReview(log.id, log.client_id!, true)} disabled={reviewWorkout.isPending || addComment.isPending}>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />Zkontrolovat s komentářem
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleAddComment(log.id, log.client_id!)} disabled={addComment.isPending}>
                                  <Send className="w-4 h-4 mr-1" />Pouze komentář
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setCommentingLogId(null)}>Zrušit</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-3">
                              {(log as any).status !== 'reviewed' && (
                                <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); handleReview(log.id, log.client_id!); }} disabled={reviewWorkout.isPending}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />Zkontrolovat
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setCommentingLogId(log.id); }}>
                                <MessageSquare className="w-4 h-4 mr-2" />Přidat komentář
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
