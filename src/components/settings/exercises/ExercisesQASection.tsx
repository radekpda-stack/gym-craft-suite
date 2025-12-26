import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Dumbbell, 
  TrendingUp, 
  ExternalLink, 
  Activity,
  AlertCircle,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { 
  useExercisesWithoutMuscleGroups, 
  useTopUsedExercisesWithoutMuscleGroups,
  BODY_PART_LABELS 
} from '@/hooks/useBodyPartCategories';
import {
  useSuspiciousCardioExercises,
  useOverTaggedExercises,
  useUnderTaggedExercises,
  useExercisesWithoutBodyPartCategories
} from '@/hooks/useExerciseQA';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function ExercisesQASection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Data hooks
  const { exercises: allWithoutMuscles, isLoading: loadingAll } = useExercisesWithoutMuscleGroups();
  const { exercises: topUsedWithoutMuscles, isLoading: loadingTop } = useTopUsedExercisesWithoutMuscleGroups(20);
  const { data: suspiciousCardio = [], isLoading: loadingSuspicious } = useSuspiciousCardioExercises();
  const { data: overTagged = [], isLoading: loadingOver } = useOverTaggedExercises();
  const { data: underTagged = [], isLoading: loadingUnder } = useUnderTaggedExercises();
  const { data: withoutCategories = [], isLoading: loadingCategories } = useExercisesWithoutBodyPartCategories();

  const handleNavigateToExercise = (exerciseId: string) => {
    navigate(`/exercises?edit=${exerciseId}`);
  };

  const totalIssues = 
    allWithoutMuscles.length + 
    suspiciousCardio.length + 
    overTagged.length + 
    underTagged.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Exercises QA Dashboard</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Kontrola kvality dat pro cviky – svalové skupiny, kategorie a podezřelá označení.
      </p>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={allWithoutMuscles.length === 0 ? 'border-green-500/50' : 'border-amber-500/50'}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {allWithoutMuscles.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              Bez partií
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {loadingAll ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className={`text-2xl font-bold ${allWithoutMuscles.length === 0 ? 'text-green-500' : 'text-amber-500'}`}>
                {allWithoutMuscles.length}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={suspiciousCardio.length === 0 ? 'border-green-500/50' : 'border-orange-500/50'}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {suspiciousCardio.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Activity className="w-4 h-4 text-orange-500" />
              )}
              Podezřelé kardio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {loadingSuspicious ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className={`text-2xl font-bold ${suspiciousCardio.length === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                {suspiciousCardio.length}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={overTagged.length === 0 ? 'border-green-500/50' : 'border-red-500/50'}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {overTagged.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              Over-tagged
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {loadingOver ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className={`text-2xl font-bold ${overTagged.length === 0 ? 'text-green-500' : 'text-red-500'}`}>
                {overTagged.length}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={underTagged.length === 0 ? 'border-green-500/50' : 'border-blue-500/50'}>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {underTagged.length === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-blue-500" />
              )}
              Under-tagged
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {loadingUnder ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className={`text-2xl font-bold ${underTagged.length === 0 ? 'text-green-500' : 'text-blue-500'}`}>
                {underTagged.length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="suspicious">Podezřelé</TabsTrigger>
          <TabsTrigger value="tagging">Označení</TabsTrigger>
          <TabsTrigger value="missing">Chybějící</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Souhrnný přehled</CardTitle>
              <CardDescription>
                Celkový stav kvality dat pro cviky
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalIssues === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium text-green-600">Všechna data jsou v pořádku!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Žádné problémy s kvalitou dat pro cviky.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Nalezeno <strong>{totalIssues}</strong> potenciálních problémů:
                  </p>
                  <ul className="space-y-2">
                    {allWithoutMuscles.length > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>{allWithoutMuscles.length} cviků bez svalových skupin</span>
                      </li>
                    )}
                    {suspiciousCardio.length > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <Activity className="w-4 h-4 text-orange-500" />
                        <span>{suspiciousCardio.length} podezřelých kardio cviků</span>
                      </li>
                    )}
                    {overTagged.length > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span>{overTagged.length} cviků s příliš mnoha partiemi (&gt;7)</span>
                      </li>
                    )}
                    {underTagged.length > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span>{underTagged.length} často používaných cviků s pouze 1 partií</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Podezřelé kardio cviky
              </CardTitle>
              <CardDescription>
                Kardio cviky s neobvyklým označením (všechny 3 kategorie nebo &gt;5 svalových skupin)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSuspicious ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : suspiciousCardio.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p>Žádné podezřelé kardio cviky!</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {suspiciousCardio.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{ex.name}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {ex.bodyParts.map(bp => (
                                <Badge key={bp} variant="outline" className="text-xs">
                                  {BODY_PART_LABELS[bp] || bp}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {ex.reason === 'multi_category' 
                                ? '⚠️ Má všechny 3 kategorie (Horní/Dolní/Core)'
                                : `⚠️ Příliš mnoho svalových skupin (${ex.muscleCount})`
                              }
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNavigateToExercise(ex.id)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tagging" className="mt-4 space-y-4">
          {/* Over-tagged */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Over-tagged (&gt;7 partií)
              </CardTitle>
              <CardDescription>
                Cviky s neobvykle vysokým počtem svalových skupin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOver ? (
                <Skeleton className="h-20 w-full" />
              ) : overTagged.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">Žádné over-tagged cviky</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {overTagged.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{ex.name}</p>
                          <Badge variant="destructive" className="text-xs mt-1">
                            {ex.muscleCount} partií
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigateToExercise(ex.id)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Under-tagged */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Under-tagged (1 partie, často používané)
              </CardTitle>
              <CardDescription>
                Často používané cviky, které mají pouze 1 svalovou skupinu
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUnder ? (
                <Skeleton className="h-20 w-full" />
              ) : underTagged.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">Žádné under-tagged cviky</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {underTagged.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{ex.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              1 partie
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {ex.usageCount}× použito
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigateToExercise(ex.id)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Cviky bez svalových skupin
              </CardTitle>
              <CardDescription>
                Nejpoužívanější cviky bez přiřazených svalových skupin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTop ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : topUsedWithoutMuscles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p>Všechny používané cviky mají svalové skupiny!</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {topUsedWithoutMuscles.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{ex.name}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {ex.count}× použito
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigateToExercise(ex.id)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Upravit
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
