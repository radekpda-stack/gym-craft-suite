import { useNavigate } from 'react-router-dom';
import { Dumbbell, Heart, Zap, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CategoryCardsProps {
  categories: {
    strength: { count: number; entries: number };
    cardio: { count: number; entries: number };
    plyometric: { count: number; entries: number };
  };
  isLoading?: boolean;
  onCategoryClick?: (category: 'strength' | 'cardio' | 'plyometric') => void;
}

const CATEGORY_CONFIG = {
  strength: {
    icon: Dumbbell,
    label: 'Síla',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    hoverBg: 'hover:bg-primary/5',
  },
  cardio: {
    icon: Heart,
    label: 'Kardio',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
    hoverBg: 'hover:bg-success/5',
  },
  plyometric: {
    icon: Zap,
    label: 'Plyometrie',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    hoverBg: 'hover:bg-warning/5',
  },
};

export function CategoryCards({ categories, isLoading, onCategoryClick }: CategoryCardsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Kategorie cviků
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const handleClick = (category: 'strength' | 'cardio' | 'plyometric') => {
    if (onCategoryClick) {
      onCategoryClick(category);
    } else {
      navigate(`/performance?tab=exercises&category=${category}`);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Kategorie cviků
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG.strength][]).map(
          ([key, config]) => {
            const stats = categories[key];
            const Icon = config.icon;

            return (
              <button
                key={key}
                onClick={() => handleClick(key)}
                className={cn(
                  'relative glass rounded-xl p-4 text-left transition-all',
                  'border',
                  config.borderColor,
                  config.hoverBg,
                  'hover:scale-[1.02] active:scale-[0.98]',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              >
                <div className={cn('p-2 rounded-lg w-fit mb-3', config.bgColor)}>
                  <Icon className={cn('w-5 h-5', config.color)} />
                </div>
                
                <p className={cn('text-sm font-bold uppercase tracking-wide', config.color)}>
                  {config.label}
                </p>
                
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.count}
                </p>
                <p className="text-xs text-muted-foreground">
                  cviků
                </p>

                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    {stats.entries.toLocaleString('cs-CZ')} záznamů
                  </p>
                </div>

                <ChevronRight className="absolute top-4 right-3 w-4 h-4 text-muted-foreground/50" />
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
