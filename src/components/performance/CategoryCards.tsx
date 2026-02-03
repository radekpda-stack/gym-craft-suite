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
    glowColor: 'shadow-primary/20',
  },
  cardio: {
    icon: Heart,
    label: 'Kardio',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    glowColor: 'shadow-emerald-500/20',
  },
  plyometric: {
    icon: Zap,
    label: 'Plyometrie',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    glowColor: 'shadow-warning/20',
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
            <Skeleton key={i} className="h-32 rounded-xl" />
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
      <h3 className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        Kategorie cviků
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(CATEGORY_CONFIG) as [keyof typeof CATEGORY_CONFIG, typeof CATEGORY_CONFIG.strength][]).map(
          ([key, config]) => {
            const stats = categories[key];
            const Icon = config.icon;

              // Calculate usage percentage for gauge
              const maxEntries = Math.max(categories.strength.entries, categories.cardio.entries, categories.plyometric.entries, 1);
              const usagePercent = (stats.entries / maxEntries) * 100;

              return (
                <button
                  key={key}
                  onClick={() => handleClick(key)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl p-4 text-left',
                    'bg-card/80 backdrop-blur-md',
                    'border shadow-sm transition-all duration-200',
                    config.borderColor,
                    'hover:shadow-lg hover:-translate-y-1',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30'
                  )}
                  style={{
                    ['--hover-glow' as string]: key === 'strength' ? 'var(--primary)' : key === 'cardio' ? '142 76% 36%' : '38 92% 50%',
                  }}
                >
                  {/* Background gradient */}
                  <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br to-transparent", config.bgColor)} />
                  
                  <div className="relative">
                    <div className={cn('p-2.5 rounded-xl w-fit mb-3 shadow-sm', config.bgColor)}>
                      <Icon className={cn('w-5 h-5', config.color)} />
                    </div>
                    
                    <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-1', config.color)}>
                      {config.label}
                    </p>
                    
                    <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                      {stats.count}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      cviků
                    </p>

                    {/* Usage gauge */}
                    <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div 
                          className={cn('h-full rounded-full transition-all duration-500', config.bgColor.replace('/10', ''))}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {stats.entries.toLocaleString('cs-CZ')} záznamů
                      </p>
                    </div>

                    <ChevronRight className="absolute top-3 right-2 w-4 h-4 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            }
        )}
      </div>
    </div>
  );
}
