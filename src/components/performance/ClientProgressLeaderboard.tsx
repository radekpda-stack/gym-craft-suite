import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, ChevronRight, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TopClient {
  id: string;
  name: string;
  entriesCount: number;
  prCount: number;
  trend: number;
}

interface ClientProgressLeaderboardProps {
  topClients: TopClient[];
  isLoading?: boolean;
}

const RANK_STYLES = [
  { 
    color: 'text-yellow-500', 
    glow: 'shadow-yellow-500/30', 
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/40',
    hoverShadow: 'hover:shadow-yellow-500/20',
  }, // 1st - Gold
  { 
    color: 'text-gray-400', 
    glow: 'shadow-gray-400/20', 
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/40',
    hoverShadow: 'hover:shadow-gray-400/20',
  }, // 2nd - Silver
  { 
    color: 'text-amber-600', 
    glow: 'shadow-amber-600/20', 
    bg: 'bg-amber-600/10',
    border: 'border-amber-600/40',
    hoverShadow: 'hover:shadow-amber-600/20',
  }, // 3rd - Bronze
  { 
    color: 'text-muted-foreground', 
    glow: '', 
    bg: 'bg-muted/30',
    border: 'border-border/30',
    hoverShadow: '',
  },
  { 
    color: 'text-muted-foreground', 
    glow: '', 
    bg: 'bg-muted/30',
    border: 'border-border/30',
    hoverShadow: '',
  },
];

export function ClientProgressLeaderboard({ topClients, isLoading }: ClientProgressLeaderboardProps) {
  const navigate = useNavigate();

  // Calculate max entries for progress bar
  const maxEntries = Math.max(...topClients.map((c) => c.entriesCount), 1);

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (topClients.length === 0) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-warning/10 shadow-lg shadow-warning/20">
            <Trophy className="w-4 h-4 text-warning" />
          </div>
          <h3 className="font-semibold text-foreground">Top aktivní klienti</h3>
          <Badge variant="secondary" className="text-[10px]">30 dní</Badge>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          Zatím žádné záznamy v tomto období
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-warning/15 shadow-lg shadow-warning/25">
            <Trophy className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Top aktivní klienti</h3>
            <p className="text-[10px] text-muted-foreground">Podle počtu záznamů</p>
          </div>
          <Badge variant="secondary" className="text-[10px] ml-1">30 dní</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 h-7"
          onClick={() => navigate('/clients')}
        >
          Více
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {topClients.map((client, index) => {
          const progressPercent = (client.entriesCount / maxEntries) * 100;
          const TrendIcon = client.trend > 0 ? TrendingUp : client.trend < 0 ? TrendingDown : Minus;
          const trendColor = 'text-muted-foreground';
          const rankStyle = RANK_STYLES[index] || RANK_STYLES[4];
          const isTopThree = index < 3;

          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className={cn(
                'w-full flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl',
                'bg-background/60 backdrop-blur-sm',
                'border shadow-sm',
                rankStyle.border,
                'hover:shadow-lg',
                'transition-all duration-200',
                'text-left',
                isTopThree && rankStyle.glow && `shadow-sm ${rankStyle.glow}`
              )}
            >
              {/* Rank Badge */}
              <div className={cn(
                'w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                rankStyle.bg,
              )}>
                {isTopThree ? (
                  <Medal className={cn('w-4 h-4 sm:w-5 sm:h-5', rankStyle.color)} />
                ) : (
                  <span className={cn("text-xs sm:text-sm", rankStyle.color)}>{index + 1}</span>
                )}
              </div>

              {/* Client info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {client.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {client.prCount > 0 && (
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] text-warning border-warning/30 bg-warning/10 px-1.5 py-0">
                        <Trophy className="w-2.5 h-2.5 mr-0.5" />
                        {client.prCount}
                      </Badge>
                    )}
                    <div className={cn('flex items-center gap-0.5 text-[10px] font-medium', trendColor)}>
                      <TrendIcon className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 sm:h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isTopThree ? "bg-gradient-to-r from-primary/80 to-primary" : "bg-primary/50"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground w-12 sm:w-16 text-right tabular-nums font-medium">
                    {client.entriesCount} zázn.
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
