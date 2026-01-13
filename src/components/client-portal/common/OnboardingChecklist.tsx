import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, X, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useClientPreferences } from '@/hooks/useClientPreferences';
import { Link } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  link?: string;
  isCompleted: boolean;
}

interface OnboardingChecklistProps {
  hasAnonymousBenchmarks?: boolean;
  hasMeasurement?: boolean;
  hasTrackedExercise?: boolean;
  hasNutritionEntry?: boolean;
  onDismiss?: () => void;
}

export function OnboardingChecklist({
  hasAnonymousBenchmarks = false,
  hasMeasurement = false,
  hasTrackedExercise = false,
  hasNutritionEntry = false,
  onDismiss,
}: OnboardingChecklistProps) {
  const { preferences, updatePreferences, isLoading } = useClientPreferences();
  const [dismissed, setDismissed] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'benchmarks',
      title: 'Zapni anonymní srovnání',
      description: 'Porovnej své výsledky s ostatními (volitelné)',
      link: '/zona/settings',
      isCompleted: hasAnonymousBenchmarks,
    },
    {
      id: 'measurement',
      title: 'Přidej první měření',
      description: 'Zaznamenej váhu nebo tělesný tuk',
      link: '/zona/progress',
      isCompleted: hasMeasurement,
    },
    {
      id: 'exercise',
      title: 'Sleduj svůj pokrok',
      description: 'Trenér ti označí cviky ke sledování',
      isCompleted: hasTrackedExercise,
    },
    {
      id: 'nutrition',
      title: 'Vyplň první den kampaně',
      description: 'Začni sledovat svou stravu',
      link: '/zona/nutrition',
      isCompleted: hasNutritionEntry,
    },
  ];

  const completedCount = steps.filter(s => s.isCompleted).length;
  const progress = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  // Auto-dismiss when all completed
  useEffect(() => {
    if (allCompleted && !preferences?.onboarding_completed) {
      updatePreferences({ onboarding_completed: true });
    }
  }, [allCompleted, preferences?.onboarding_completed, updatePreferences]);

  // Don't show if dismissed or completed
  if (dismissed || preferences?.onboarding_completed || isLoading) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    updatePreferences({ onboarding_completed: true });
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Začni tady
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{completedCount} z {steps.length} splněno</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {step.link && !step.isCompleted ? (
                    <Link to={step.link}>
                      <StepItem step={step} />
                    </Link>
                  ) : (
                    <StepItem step={step} />
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

function StepItem({ step }: { step: OnboardingStep }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-lg transition-colors",
        step.isCompleted 
          ? "bg-success/10" 
          : "bg-muted/50 hover:bg-muted cursor-pointer"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
          step.isCompleted
            ? "bg-success text-success-foreground"
            : "bg-muted-foreground/20"
        )}
      >
        {step.isCompleted ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          step.isCompleted && "line-through text-muted-foreground"
        )}>
          {step.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {step.description}
        </p>
      </div>
      {!step.isCompleted && step.link && (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}
