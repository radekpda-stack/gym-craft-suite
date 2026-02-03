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
    borderColor: 'border-primary/30',
    shadowColor: 'shadow-primary/20',
    gradientFrom: 'from-primary/30',
    barColor: 'bg-primary/60',
  },
  cardio: {
    icon: Heart,
    label: 'Kardio',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    shadowColor: 'shadow-emerald-500/20',
    gradientFrom: 'from-emerald-500/30',
    barColor: 'bg-emerald-500/60',
  },
  plyometric: {
    icon: Zap,
    label: 'Plyometrie',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    shadowColor: 'shadow-warning/20',
    gradientFrom: 'from-warning/30',
    barColor: 'bg-warning/60',
  },
};

export function CategoryCards({ categories, isLoading, onCategoryClick }: CategoryCardsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Kategorie cviků
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
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

  // Calculate max entries for relative gauge
  const maxEntries = Math.max(
    categories.strength.entries,
    categories.cardio.entries,
    categories.plyometric.entries,
    1
  );

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Kategorie cviků
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG.strength][]).map(
          ([key, config]) => {
            const stats = categories[key];
            const Icon = config.icon;
            const usagePercent = (stats.entries / maxEntries) * 100;

            return (
              <button
                key={key}
                onClick={() => handleClick(key)}
                className={cn(
                  'group relative overflow-hidden rounded-xl p-4 text-left',
                  'bg-card/80 backdrop-blur-md',
                  'border shadow-sm transition-all duration-300',
                  config.borderColor,
                  'hover:shadow-xl hover:-translate-y-1',
                  config.shadowColor.replace('shadow-', 'hover:shadow-'),
                  'focus:outline-none focus:ring-2 focus:ring-primary/30'
                )}
              >
                {/* Gradient overlay */}
                <div className={cn(
                  "absolute inset-0 opacity-20 bg-gradient-to-br to-transparent transition-opacity duration-300",
                  config.gradientFrom,
                  "group-hover:opacity-40"
                )} />
                
                {/* Top glow on hover */}
                <div className={cn(
                  "absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 transition-opacity duration-300",
                  config.bgColor,
                  "group-hover:opacity-50"
                )} />
                
                <div className="relative">
                  {/* Icon */}
                  <div className={cn(
                    'p-2.5 rounded-xl w-fit mb-3 shadow-lg transition-all duration-300',
                    config.bgColor,
                    config.shadowColor,
                    'group-hover:scale-110'
                  )}>
                    <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', config.color)} />
                  </div>
                  
                  {/* Category label */}
                  <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-1', config.color)}>
                    {config.label}
                  </p>
                  
                  {/* Count - prominent */}
                  <p className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                    {stats.count}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    cviků
                  </p>

                  {/* Usage gauge */}
                  <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5">
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full transition-all duration-700 ease-out', config.barColor)}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
                      {stats.entries.toLocaleString('cs-CZ')} záznamů
                    </p>
                  </div>

                  {/* Chevron with hover animation */}
                  <ChevronRight className={cn(
                    "absolute top-3 right-2 w-4 h-4 text-muted-foreground/40 transition-all duration-200",
                    "group-hover:translate-x-1 group-hover:text-muted-foreground"
                  )} />
                </div>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
