import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Scale, MessageCircle, Plus, Dumbbell, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientActivityPreferences } from '@/hooks/useClientActivityPreferences';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

export function ClientQuickActions() {
  const { clientId } = useClientPortal();
  const { data: prefs } = useClientActivityPreferences(clientId ?? undefined);
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';

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
      id: 'chat',
      label: 'S trenérem',
      icon: <MessageCircle className="w-5 h-5" />,
      path: '/chat',
      color: 'text-accent',
      bgColor: 'bg-accent/10 hover:bg-accent/20',
    },
    {
      id: 'progress',
      label: 'Pokrok',
      icon: <Scale className="w-5 h-5" />,
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
  
  // Dynamic grid columns based on number of actions
  const gridCols = allActions.length <= 3 
    ? 'grid-cols-3' 
    : allActions.length === 4 
      ? 'grid-cols-4' 
      : 'grid-cols-5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={cn("grid gap-2", gridCols)}
    >
      {allActions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 + index * 0.05 }}
        >
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
        </motion.div>
      ))}
    </motion.div>
  );
}

