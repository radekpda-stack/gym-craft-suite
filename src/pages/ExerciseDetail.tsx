import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Users, Activity, Trophy, TrendingUp, TrendingDown, Minus, BarChart3, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExerciseStats } from '@/hooks/useExerciseStats';
import { useExercises } from '@/hooks/useExercises';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ExerciseClientToggle } from '@/components/exercises/ExerciseClientToggle';
import { ExerciseProgressChart } from '@/components/exercises/ExerciseProgressChart';
import { ExerciseHistoryTable } from '@/components/exercises/ExerciseHistoryTable';
import { ExerciseClientComparison } from '@/components/exercises/ExerciseClientComparison';

const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  squat: 'Dřep',
  hinge: 'Hip hinge',
  lunge: 'Výpad',
  push_horizontal: 'Tlak horizontální',
  push_vertical: 'Tlak vertikální',
  pull_horizontal: 'Tah horizontální',
  pull_vertical: 'Tah vertikální',
  carry: 'Přenášení',
  core_anti_extension: 'Core anti-extenze',
  core_anti_rotation: 'Core anti-rotace',
  core_anti_lateral_flexion: 'Core anti-laterální flexe',
  rotation: 'Rotace',
  locomotion: 'Lokomoce',
  conditioning: 'Kondice',
  mobility: 'Mobilita',
  other: 'Ostatní',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Začátečník',
  intermediate: 'Pokročilý',
  advanced: 'Expert',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  bodyweight: 'Vlastní váha',
  barbell: 'Činka',
  dumbbell: 'Jednoručky',
  kettlebell: 'Kettlebell',
  cable: 'Kladka',
  machine: 'Stroj',
  bands: 'Gumy',
  bench: 'Lavice',
  pullup_bar: 'Hrazda',
  rings: 'Kruhy',
  trx: 'TRX',
  box: 'Bedna',
  medicine_ball: 'Medicinbal',
  slam_ball: 'Slam ball',
  rower: 'Veslovací trenažér',
  ski_erg: 'Ski erg',
  treadmill: 'Běžecký pás',
  treadmill_sled_mode: 'Běžecký pás (sled)',
  sled: 'Sáně',
  landmine: 'Landmine',
  hex_bar: 'Hex bar',
  plyo_platform: 'Plyometrická platforma',
  other: 'Jiné',
};

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { exercises } = useExercises();
  const { data: stats, isLoading: statsLoading } = useExerciseStats(id || null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const exercise = exercises.find((e) => e.id === id);
  
  // Determine exercise type
  const exerciseType: 'strength' | 'cardio' | 'mixed' = 
    exercise?.category?.toLowerCase().includes('kardio') || exercise?.category?.toLowerCase().includes('cardio')
      ? 'cardio'
      : 'strength';

  if (!exercise) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="ghost" onClick={() => navigate('/exercises')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na cviky
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <p>Cvik nenalezen</p>
        </div>
      </div>
    );
  }

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/exercises')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{exercise.name_cs || exercise.name}</h1>
              <p className="text-muted-foreground text-sm">{exercise.category}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              <span>Klienti</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalClients || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="w-4 h-4" />
              <span>Záznamy</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.totalEntries || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Max váha</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats?.globalMaxWeight ? `${stats.globalMaxWeight} kg` : '-'}
            </p>
            {stats?.globalMaxWeightClient && (
              <p className="text-xs text-muted-foreground">{stats.globalMaxWeightClient}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>Průměr</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats?.averageWeight ? `${stats.averageWeight} kg` : '-'}
            </p>
            {stats?.averageReps && (
              <p className="text-xs text-muted-foreground">~{stats.averageReps} opak.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Toggle */}
      <ExerciseClientToggle value={selectedClientId} onChange={setSelectedClientId} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Grafy
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            Historie
          </TabsTrigger>
          <TabsTrigger value="clients">Porovnání</TabsTrigger>
          <TabsTrigger value="prs">PR</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informace o cviku</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {exercise.movement_pattern && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pohybový vzorec</p>
                    <p className="font-medium">
                      {MOVEMENT_PATTERN_LABELS[exercise.movement_pattern] || exercise.movement_pattern}
                    </p>
                  </div>
                )}
                {exercise.difficulty && (
                  <div>
                    <p className="text-sm text-muted-foreground">Obtížnost</p>
                    <Badge variant="outline">
                      {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                    </Badge>
                  </div>
                )}
              </div>

              {exercise.equipment && exercise.equipment.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Vybavení</p>
                  <div className="flex flex-wrap gap-1">
                    {exercise.equipment.map((eq) => (
                      <Badge key={eq} variant="secondary">
                        {EQUIPMENT_LABELS[eq] || eq}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Svalové skupiny</p>
                  <div className="flex flex-wrap gap-1">
                    {exercise.muscle_groups.map((muscle) => (
                      <Badge key={muscle} variant="outline">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(exercise.description_cs || exercise.description) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Popis</p>
                  <p className="text-sm">{exercise.description_cs || exercise.description}</p>
                </div>
              )}

              {exercise.instructions_cs && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Instrukce</p>
                  <p className="text-sm whitespace-pre-wrap">{exercise.instructions_cs}</p>
                </div>
              )}

              <div className="flex gap-4 pt-2 text-sm text-muted-foreground">
                {exercise.is_unilateral && <Badge variant="outline">Unilaterální</Badge>}
                {exercise.is_bodyweight && <Badge variant="outline">Vlastní váha</Badge>}
                {exercise.is_time_based && <Badge variant="outline">Na čas</Badge>}
              </div>
            </CardContent>
          </Card>

          {stats?.mostActiveClient && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Nejaktivnější klient</p>
                    <p className="font-medium">{stats.mostActiveClient.name}</p>
                  </div>
                  <Badge variant="secondary">{stats.mostActiveClient.count}× záznamů</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <ExerciseProgressChart 
            exerciseId={id!} 
            exerciseType={exerciseType} 
            clientId={selectedClientId} 
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <ExerciseHistoryTable 
            exerciseId={id!} 
            exerciseType={exerciseType} 
            clientId={selectedClientId} 
          />
        </TabsContent>

        {/* Client Comparison Tab */}
        <TabsContent value="clients" className="space-y-4">
          {selectedClientId ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Pro porovnání klientů přepněte na "Všichni klienti".
              </CardContent>
            </Card>
          ) : (
            <ExerciseClientComparison exerciseId={id!} exerciseType={exerciseType} />
          )}
        </TabsContent>

        {/* PR History Tab */}
        <TabsContent value="prs" className="space-y-4">
          {!stats?.prHistory?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Zatím žádné osobní rekordy</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Historie osobních rekordů
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.prHistory.map((pr, idx) => (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/clients/${pr.clientId}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          idx === 0 && "bg-yellow-500/20 text-yellow-600",
                          idx === 1 && "bg-gray-300/30 text-gray-600",
                          idx === 2 && "bg-orange-500/20 text-orange-600",
                          idx > 2 && "bg-muted text-muted-foreground"
                        )}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium">{pr.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(pr.date), 'd. MMMM yyyy', { locale: cs })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{pr.weight} kg</p>
                        {pr.reps > 0 && (
                          <p className="text-xs text-muted-foreground">{pr.reps} opak.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
