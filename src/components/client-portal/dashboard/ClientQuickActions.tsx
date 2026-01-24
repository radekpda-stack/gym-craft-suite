import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Scale, Dumbbell, Apple, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientActivityPreferences } from '@/hooks/useClientActivityPreferences';
import { AddMeasurementDialog } from '@/components/client-portal/progress/AddMeasurementDialog';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

export function ClientQuickActions() {
  const { clientId } = useClientPortal();
  const { data: prefs } = useClientActivityPreferences(clientId ?? undefined);
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';
  const [showWeightDialog, setShowWeightDialog] = useState(false);

  // Base actions (always visible)
  const baseActions: QuickAction[] = [
    {
      id: 'diary',
      label: 'Deník',
      icon: <BookOpen className="w-5 h-5" />,
      path: '/diary',
      color: 'text-primary',
      bgColor: 'bg-primary/10 hover:bg-primary/20',
    },
    {
      id: 'add-weight',
      label: 'Přidat váhu',
      icon: <Scale className="w-5 h-5" />,
      color: 'text-accent',
      bgColor: 'bg-accent/10 hover:bg-accent/20',
      onClick: () => setShowWeightDialog(true),
    },
    {
      id: 'progress',
      label: 'Pokrok',
      icon: <TrendingUp className="w-5 h-5" />,
      path: '/progress',
      color: 'text-success',
      bgColor: 'bg-success/10 hover:bg-success/20',
    },
  ];

  // Smart shortcuts (only shown if client uses these features)
  const smartActions: QuickAction[] = [];
  
  if (prefs?.hasOwnWorkouts) {
    smartActions.push({
      id: 'add-workout',
      label: '+ Trénink',
      icon: <Dumbbell className="w-5 h-5" />,
      path: '/diary?action=add-workout',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
    });
  }
  
  if (prefs?.hasNutritionEntries) {
    smartActions.push({
      id: 'add-food',
      label: '+ Strava',
      icon: <Apple className="w-5 h-5" />,
      path: '/diary?tab=nutrition&action=add-food',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10 hover:bg-green-500/20',
    });
  }

  const allActions = [...baseActions, ...smartActions];
  
  // Dynamic grid - use 3 cols on mobile, expand on larger screens
  // If 4+ actions, show 2 rows on mobile (grid-cols-3), single row on sm+ (grid-cols-4 or 5)
  const getGridClass = () => {
    const count = allActions.length;
    if (count <= 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2 sm:grid-cols-4';
    return 'grid-cols-3 sm:grid-cols-5'; // 5 items: 3+2 on mobile, 5 on larger
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={cn("grid gap-2", getGridClass())}
      >
        {allActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 + index * 0.05 }}
          >
            {action.path ? (
              <Link to={`${basePath}${action.path}`}>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 h-auto py-3 px-2 w-full rounded-xl transition-all",
                    action.bgColor
                  )}
                >
                  <div className={cn("shrink-0", action.color)}>
                    {action.icon}
                  </div>
                  <span className="text-xs font-medium text-foreground/80">
                    {action.label}
                  </span>
                </Button>
              </Link>
            ) : (
              <Button
                variant="ghost"
                onClick={action.onClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 h-auto py-3 px-2 w-full rounded-xl transition-all",
                  action.bgColor
                )}
              >
                <div className={cn("shrink-0", action.color)}>
                  {action.icon}
                </div>
                <span className="text-xs font-medium text-foreground/80">
                  {action.label}
                </span>
              </Button>
            )}
          </motion.div>
        ))}
      </motion.div>

      <AddMeasurementDialog 
        defaultType="weight"
        trigger={<span className="hidden" />}
        open={showWeightDialog}
        onOpenChange={setShowWeightDialog}
      />
    </>
  );
}

