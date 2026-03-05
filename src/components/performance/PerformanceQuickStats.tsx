/**
 * PerformanceQuickStats - Merged KPI bar + Category cards
 * Compact 3-card widget with summary row and mini progress rings
 */
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Heart, Zap, Trophy, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface QuickStatsProps {
  categories: {
    strength: { count: number; entries: number };
    cardio: { count: number; entries: number };
    plyometric: { count: number; entries: number };
  };
  totalEntries: number;
  totalPRs: number;
  isLoading?: boolean;
  onCategoryClick?: (category: 'strength' | 'cardio' | 'plyometric') => void;
}

const CATS = [
  {
    key: 'strength' as const,
    icon: Dumbbell,
    label: 'Síla',
    color: 'text-primary',
    ring: 'stroke-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/25',
  },
  {
    key: 'cardio' as const,
    icon: Heart,
    label: 'Kardio',
    color: 'text-emerald-500',
    ring: 'stroke-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  {
    key: 'plyometric' as const,
    icon: Zap,
    label: 'Plyo',
    color: 'text-warning',
    ring: 'stroke-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/25',
  },
];

function MiniRing({ percent, strokeClass }: { percent: number; strokeClass: string }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" className="stroke-muted/20" />
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className={strokeClass}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
        style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
      />
    </svg>
  );
}

export function PerformanceQuickStats({ categories, totalEntries, totalPRs, isLoading, onCategoryClick }: QuickStatsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="h-8 flex-1 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const maxEntries = Math.max(categories.strength.entries, categories.cardio.entries, categories.plyometric.entries, 1);

  return (
    <div className="space-y-2">
      {/* Summary pills */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/80 border border-border/30">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-semibold tabular-nums">{totalEntries.toLocaleString('cs-CZ')}</span>
          <span className="text-[10px] text-muted-foreground">zázn. / měsíc</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/80 border border-border/30">
          <Trophy className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-semibold tabular-nums">{totalPRs}</span>
          <span className="text-[10px] text-muted-foreground">PR / měsíc</span>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-3 gap-2">
        {CATS.map(cat => {
          const stats = categories[cat.key];
          const Icon = cat.icon;
          const pct = (stats.entries / maxEntries) * 100;

          return (
            <button
              key={cat.key}
              onClick={() => { if (onCategoryClick) onCategoryClick(cat.key); else navigate(`/performance?tab=library&category=${cat.key}`); }}
              className={cn(
                'relative overflow-hidden rounded-xl p-3 text-left',
                'bg-card/80 backdrop-blur-md border shadow-sm',
                cat.border,
                'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/30'
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn('p-1.5 rounded-lg', cat.bg)}>
                  <Icon className={cn('w-4 h-4', cat.color)} />
                </div>
                <MiniRing percent={pct} strokeClass={cat.ring} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums leading-tight mt-1">
                {stats.count}
              </p>
              <p className={cn('text-[9px] font-bold uppercase tracking-widest', cat.color)}>
                {cat.label}
              </p>
              <p className="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                {stats.entries} zázn.
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
