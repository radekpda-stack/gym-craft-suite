import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Dumbbell, Loader2 } from 'lucide-react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientAllExercises, ClientExerciseProgress } from '@/hooks/useClientAllExercises';
import { ExerciseSparklineItem } from './ExerciseSparklineItem';
import { ExerciseProgressSheet } from './ExerciseProgressSheet';
import { useNavigate } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { usePortalBasePath } from '@/hooks/usePortalBasePath';

export function MyExercisesWidget() {
  const { clientId } = useClientPortal();
  const navigate = useNavigate();
  const basePath = usePortalBasePath();
  const { data: exercises, isLoading } = useClientAllExercises(clientId, 12); // Extend to 12 months
  const [selectedExercise, setSelectedExercise] = useState<ClientExerciseProgress | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Show exercises with at least 1 data point, prioritize those with trends (2+ points)
  const displayExercises = exercises
    ?.filter(e => e.data.length >= 1)
    .sort((a, b) => {
      // First priority: exercises with 2+ points (can show trend)
      const aHasTrend = a.data.length >= 2 ? 1 : 0;
      const bHasTrend = b.data.length >= 2 ? 1 : 0;
      if (bHasTrend !== aHasTrend) return bHasTrend - aHasTrend;
      // Second priority: most recent activity
      return new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime();
    })
    .slice(0, 12) || []; // Show up to 12 exercises

  const handleExerciseClick = (exercise: ClientExerciseProgress) => {
    haptic('light');
    setSelectedExercise(exercise);
    setSheetOpen(true);
  };

  const handleViewAll = () => {
    haptic('selection');
    navigate(`${basePath}/progress`);
  };

  // Don't render if no exercises with data
  if (!isLoading && displayExercises.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base">Tvůj pokrok</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground h-8 px-2"
              onClick={handleViewAll}
            >
              Vše
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="pb-4">
              {/* Horizontal scrolling container */}
              <motion.div 
                className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {displayExercises.map((exercise, index) => (
                  <ExerciseSparklineItem
                    key={exercise.exerciseName}
                    exercise={exercise}
                    onClick={() => handleExerciseClick(exercise)}
                    index={index}
                  />
                ))}
              </motion.div>
              
              {/* Hint for more exercises */}
              {exercises && exercises.length > 12 && (
                <p className="text-center text-xs text-muted-foreground mt-2 px-4">
                  +{exercises.length - 12} dalších cviků
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Detail Sheet */}
      <ExerciseProgressSheet
        exercise={selectedExercise}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
