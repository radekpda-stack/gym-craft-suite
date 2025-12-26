import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Dumbbell, TrendingUp, ExternalLink } from 'lucide-react';
import { useExercisesWithoutMuscleGroups, useTopUsedExercisesWithoutMuscleGroups } from '@/hooks/useBodyPartCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function MuscleGroupReportSection() {
  const navigate = useNavigate();
  const { exercises: allWithoutMuscles, isLoading: loadingAll } = useExercisesWithoutMuscleGroups();
  const { exercises: topUsedWithoutMuscles, isLoading: loadingTop } = useTopUsedExercisesWithoutMuscleGroups(20);

  const handleNavigateToExercise = (exerciseId: string) => {
    navigate(`/exercises?edit=${exerciseId}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold">Report: Cviky bez svalových skupin</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Cviky bez přiřazených svalových skupin nemohou být správně zahrnuty do statistik rozložení zátěže.
        Doporučujeme doplnit svalové skupiny u nejpoužívanějších cviků.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Celkem bez partií
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAll ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <p className="text-3xl font-bold text-amber-500">{allWithoutMuscles.length}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top používané bez partií
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <p className="text-3xl font-bold text-red-500">{topUsedWithoutMuscles.length}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="top-used" className="mt-4">
        <TabsList>
          <TabsTrigger value="top-used">Nejpoužívanější</TabsTrigger>
          <TabsTrigger value="all">Všechny ({allWithoutMuscles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="top-used">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nejpoužívanější cviky bez svalových skupin</CardTitle>
              <CardDescription>
                Tyto cviky jsou často používané, ale nemají přiřazené svalové skupiny
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
                  <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
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

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Všechny cviky bez svalových skupin</CardTitle>
              <CardDescription>
                Kompletní seznam cviků, které nemají přiřazené svalové skupiny
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAll ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : allWithoutMuscles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Všechny cviky mají svalové skupiny!</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {allWithoutMuscles.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{ex.name}</p>
                          {ex.category && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {ex.category}
                            </Badge>
                          )}
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
