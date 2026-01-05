import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Dumbbell, MessageSquare, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainerDiaryList } from './TrainerDiaryList';

interface MyProfileWorkoutDiaryProps {
  clientId: string;
}

interface DiaryTag {
  id: string;
  name: string;
  color: string;
}

export function MyProfileWorkoutDiary({ clientId }: MyProfileWorkoutDiaryProps) {
  const [activeTab, setActiveTab] = useState('personal');
  
  // Fetch client workout logs
  const { data: workouts, isLoading: logsLoading } = useQuery({
    queryKey: ['my-workout-diary', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_workout_logs')
        .select(`
          *,
          exercises:client_workout_exercises(*)
        `)
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  // Fetch coached training sessions with exercises and tags
  const { data: coachedSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['my-coached-sessions', clientId],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          date,
          duration,
          status,
          notes,
          training_type,
          rpe,
          trainer_went_well,
          trainer_problems,
          trainer_recommendations,
          exercise_entries(
            id,
            exercise_name,
            sets,
            reps,
            weight_kg,
            time_seconds,
            is_pr,
            notes
          )
        `)
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch tags for sessions
      const sessionIds = (sessions || []).map(s => s.id);
      let tagsBySession: Record<string, DiaryTag[]> = {};

      if (sessionIds.length > 0) {
        const { data: sessionTags } = await supabase
          .from('training_session_tags')
          .select('training_session_id, tags(id, name, color)')
          .in('training_session_id', sessionIds);

        if (sessionTags) {
          tagsBySession = sessionTags.reduce((acc, st) => {
            const tag = st.tags as unknown as DiaryTag;
            if (tag) {
              if (!acc[st.training_session_id]) acc[st.training_session_id] = [];
              acc[st.training_session_id].push(tag);
            }
            return acc;
          }, {} as Record<string, DiaryTag[]>);
        }
      }

      return (sessions || []).map(session => ({
        ...session,
        tags: tagsBySession[session.id] || [],
      }));
    },
    enabled: !!clientId,
  });

  const isLoading = logsLoading || sessionsLoading;

  // Merge and sort all entries
  const allEntries = [
    ...(workouts || []).map(w => ({ ...w, type: 'manual' as const })),
    ...(coachedSessions || []).map(s => ({ ...s, type: 'coached' as const })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="personal">Můj soukromý deník</TabsTrigger>
          <TabsTrigger value="training">Tréninky</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="mt-4">
          <TrainerDiaryList />
        </TabsContent>
        
        <TabsContent value="training" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : !allEntries.length ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Zatím nejsou žádné záznamy v deníku.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allEntries.map((entry) => {
                const isCoached = entry.type === 'coached';
                const exercises = isCoached 
                  ? (entry as any).exercise_entries || []
                  : (entry as any).exercises || [];
                const tags = isCoached ? (entry as any).tags || [] : [];

                return (
                  <Card key={isCoached ? `session-${entry.id}` : entry.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            {format(new Date(entry.date), 'EEEE d. MMMM yyyy', { locale: cs })}
                            <Badge variant={isCoached ? "default" : "secondary"} className="text-xs">
                              {isCoached ? (
                                <><User className="w-3 h-3 mr-1" /> S trenérem</>
                              ) : 'Samostatně'}
                            </Badge>
                          </CardTitle>
                          <div className="flex flex-wrap gap-1">
                            {(entry as any).workout_type && !isCoached && (
                              <Badge variant="secondary" className="text-xs">
                                {(entry as any).workout_type}
                              </Badge>
                            )}
                            {(entry as any).training_type && (
                              <Badge variant="secondary" className="text-xs">
                                {(entry as any).training_type}
                              </Badge>
                            )}
                            {tags.map((tag: DiaryTag) => (
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
                        </div>
                        {((entry as any).duration_minutes || (entry as any).duration) && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {(entry as any).duration_minutes || (entry as any).duration} min
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {exercises && exercises.length > 0 && (
                        <div className="space-y-2">
                          {exercises.map((ex: any) => (
                            <div 
                              key={ex.id} 
                              className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <Dumbbell className="w-4 h-4 text-muted-foreground" />
                                <span>{ex.exercise_name}</span>
                                {(ex.is_personal_record || ex.is_pr) && (
                                  <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">PR</Badge>
                                )}
                              </div>
                              <span className="text-muted-foreground">
                                {ex.sets && `${ex.sets}×`}
                                {ex.reps && `${ex.reps}`}
                                {ex.weight_kg && ` @ ${ex.weight_kg}kg`}
                                {(ex.time_seconds || ex.duration_seconds) && ` ${Math.round((ex.time_seconds || ex.duration_seconds) / 60)}min`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(entry as any).notes && (
                        <p className="text-sm text-muted-foreground italic">{(entry as any).notes}</p>
                      )}

                      {!isCoached && (entry as any).trainer_comment && (
                        <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3">
                          <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-primary mb-1">Komentář trenéra</p>
                            <p className="text-sm">{(entry as any).trainer_comment}</p>
                          </div>
                        </div>
                      )}

                      {isCoached && ((entry as any).trainer_went_well || (entry as any).trainer_problems || (entry as any).trainer_recommendations) && (
                        <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3">
                          <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                          <div className="space-y-1 text-sm">
                            {(entry as any).trainer_went_well && (
                              <p>✅ {(entry as any).trainer_went_well}</p>
                            )}
                            {(entry as any).trainer_problems && (
                              <p>⚠️ {(entry as any).trainer_problems}</p>
                            )}
                            {(entry as any).trainer_recommendations && (
                              <p>💡 {(entry as any).trainer_recommendations}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {!isCoached && ((entry as any).energy_before || (entry as any).energy_after) && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {(entry as any).energy_before && (
                            <span>Energie před: {(entry as any).energy_before}/10</span>
                          )}
                          {(entry as any).energy_after && (
                            <span>Energie po: {(entry as any).energy_after}/10</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
