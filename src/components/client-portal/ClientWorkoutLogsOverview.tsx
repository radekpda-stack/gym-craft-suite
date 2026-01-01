import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAllClientWorkoutLogs } from '@/hooks/useClientWorkoutLogs';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { BookOpen, Dumbbell, Search, ChevronDown, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ClientWorkoutLogsOverview() {
  const { data: logs, isLoading } = useAllClientWorkoutLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const filteredLogs = logs?.filter(log => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.client?.name?.toLowerCase().includes(query) ||
      log.exercises?.some(ex => ex.exercise_name.toLowerCase().includes(query))
    );
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
          Záznamy tréninků, které si klienti zaznamenali sami
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
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

              return (
                <div
                  key={log.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleLogExpanded(log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{log.client?.name || 'Klient'}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(log.date), 'd. MMMM yyyy', { locale: cs })} • {exerciseCount} cviků
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
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <div className="px-4 pb-4 border-t pt-3 space-y-2">
                          {log.notes && (
                            <p className="text-sm text-muted-foreground italic mb-3">{log.notes}</p>
                          )}
                          {log.exercises?.map((ex, idx) => (
                            <div key={ex.id || idx} className="p-2 bg-secondary/30 rounded text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{ex.exercise_name}</span>
                                {ex.rpe && <Badge variant="secondary">RPE {ex.rpe}</Badge>}
                              </div>
                              <div className="flex gap-3 text-muted-foreground mt-1">
                                {ex.sets && <span>{ex.sets}×{ex.reps || '?'}</span>}
                                {ex.weight_kg && <span className="font-medium text-foreground">{ex.weight_kg} kg</span>}
                                {ex.duration_seconds && <span>{Math.round(ex.duration_seconds / 60)} min</span>}
                              </div>
                            </div>
                          ))}
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
