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

export function MyExercisesWidget() {
  const { clientId } = useClientPortal();
  const navigate = useNavigate();
  const { data: exercises, isLoading } = useClientAllExercises(clientId, 6);
  const [selectedExercise, setSelectedExercise] = useState<ClientExerciseProgress | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Show only exercises with at least 2 data points (for trend)
  const displayExercises = exercises?.filter(e => e.data.length >= 2).slice(0, 8) || [];

  const handleExerciseClick = (exercise: ClientExerciseProgress) => {
    haptic('light');
    setSelectedExercise(exercise);
    setSheetOpen(true);
  };

  const handleViewAll = () => {
    haptic('selection');
    navigate('/client-portal/progress?tab=cviky');
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
              {exercises && exercises.length > 8 && (
                <p className="text-center text-xs text-muted-foreground mt-2 px-4">
                  +{exercises.length - 8} dalších cviků
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
