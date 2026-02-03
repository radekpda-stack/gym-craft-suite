import { useNavigate } from 'react-router-dom';
import { Dumbbell, Heart, Zap, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface RecentExercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'plyometric';
  lastUsed: string;
}

interface RecentExercisesChipsProps {
  recentExercises: RecentExercise[];
  isLoading?: boolean;
}

const CATEGORY_ICONS = {
  strength: Dumbbell,
  cardio: Heart,
  plyometric: Zap,
};

const CATEGORY_COLORS = {
  strength: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
  cardio: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  plyometric: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
};

export function RecentExercisesChips({ recentExercises, isLoading }: RecentExercisesChipsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-32 h-4" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (recentExercises.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="w-4 h-4" />
        <span className="font-medium">Nedávno použité cviky</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {recentExercises.map((exercise) => {
          const Icon = CATEGORY_ICONS[exercise.category];
          
            return (
              <button
                key={exercise.id}
                onClick={() => navigate(`/exercises/${exercise.id}`)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                  'text-sm font-medium border backdrop-blur-sm shadow-sm',
                  'transition-all duration-200',
                  CATEGORY_COLORS[exercise.category],
                  'hover:shadow-md hover:-translate-y-0.5',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">{exercise.name}</span>
              </button>
            );
        })}
      </div>
    </div>
  );
}
