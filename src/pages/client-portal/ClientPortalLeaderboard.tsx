import { motion } from 'framer-motion';
import { Trophy, Dumbbell, Heart, Zap } from 'lucide-react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useExercisesWithPercentiles } from '@/hooks/useExercisePercentiles';
import OverallPositionHero from '@/components/client-portal/leaderboard/OverallPositionHero';
import ExerciseComparisonGrid from '@/components/client-portal/leaderboard/ExerciseComparisonGrid';
import GamificationSection from '@/components/client-portal/leaderboard/GamificationSection';

export default function ClientPortalLeaderboard() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;
  
  const { data: exercises, isLoading: exercisesLoading } = useExercisesWithPercentiles(trainerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Žebříček</h1>
          <p className="text-sm text-muted-foreground">
            Srovnej se s ostatními a sleduj svůj pokrok
          </p>
        </div>
      </motion.div>

      {/* Hero - Overall Position */}
      <OverallPositionHero clientId={clientId ?? undefined} />

      {/* Strength Exercises Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-accent" />
          </div>
          <h2 className="text-lg font-semibold">Síla</h2>
          <span className="text-sm text-muted-foreground">
            ({exercises?.strength.length || 0} cviků)
          </span>
        </div>
        
        <ExerciseComparisonGrid
          exercises={exercises?.strength || []}
          exerciseType="strength"
          trainerId={trainerId}
          clientId={clientId ?? undefined}
          isLoading={exercisesLoading}
        />
      </motion.section>

      {/* Plyometrics Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-warning" />
          </div>
          <h2 className="text-lg font-semibold">Plyometrika</h2>
          <span className="text-sm text-muted-foreground">
            ({exercises?.plyometrics.length || 0} cviků)
          </span>
        </div>
        
        <ExerciseComparisonGrid
          exercises={exercises?.plyometrics || []}
          exerciseType="plyometrics"
          trainerId={trainerId}
          clientId={clientId ?? undefined}
          isLoading={exercisesLoading}
        />
      </motion.section>

      {/* Cardio Exercises Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Heart className="w-4 h-4 text-success" />
          </div>
          <h2 className="text-lg font-semibold">Kardio</h2>
          <span className="text-sm text-muted-foreground">
            ({exercises?.cardio.length || 0} cviků)
          </span>
        </div>
        
        <ExerciseComparisonGrid
          exercises={exercises?.cardio || []}
          exerciseType="cardio"
          trainerId={trainerId}
          clientId={clientId ?? undefined}
          isLoading={exercisesLoading}
        />
      </motion.section>

      {/* Gamification Section - Collapsible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GamificationSection clientId={clientId ?? undefined} />
      </motion.div>

      {/* Info tip */}
      <motion.div 
        className="p-3 rounded-lg bg-muted/50 border border-border/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-xs text-muted-foreground text-center">
          💡 Klikni na cvik pro zobrazení detailního žebříčku. Tvá data jsou ve výchozím nastavení anonymní.
        </p>
      </motion.div>
    </div>
  );
}
