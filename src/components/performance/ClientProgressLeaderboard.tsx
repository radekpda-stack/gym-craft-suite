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
  { color: 'text-yellow-500', glow: 'shadow-yellow-500/30', bg: 'bg-yellow-500/10' }, // 1st
  { color: 'text-gray-400', glow: 'shadow-gray-400/20', bg: 'bg-gray-400/10' },   // 2nd
  { color: 'text-amber-600', glow: 'shadow-amber-600/20', bg: 'bg-amber-600/10' },  // 3rd
  { color: 'text-muted-foreground', glow: '', bg: 'bg-muted/30' },
  { color: 'text-muted-foreground', glow: '', bg: 'bg-muted/30' },
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
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (topClients.length === 0) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-warning/10">
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
          <div className="p-2 rounded-lg bg-warning/10 shadow-sm shadow-warning/20">
            <Trophy className="w-4 h-4 text-warning" />
          </div>
          <h3 className="font-semibold text-foreground">Top aktivní klienti</h3>
          <Badge variant="secondary" className="text-[10px]">30 dní</Badge>
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
          const trendColor = client.trend > 0 ? 'text-emerald-500' : client.trend < 0 ? 'text-destructive' : 'text-muted-foreground';
          const rankStyle = RANK_STYLES[index] || RANK_STYLES[4];

          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl',
                'bg-background/60 backdrop-blur-sm',
                'border border-border/30',
                'hover:bg-muted/50 hover:shadow-md hover:-translate-y-0.5',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                'text-left'
              )}
            >
              {/* Rank */}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                rankStyle.bg,
                index < 3 && 'shadow-sm',
                rankStyle.glow
              )}>
                {index < 3 ? (
                  <Medal className={cn('w-4 h-4', rankStyle.color)} />
                ) : (
                  <span className={rankStyle.color}>{index + 1}</span>
                )}
              </div>

              {/* Client info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="font-medium text-foreground truncate">
                    {client.name}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {client.prCount > 0 && (
                      <Badge variant="outline" className="text-[10px] text-warning border-warning/30 bg-warning/5">
                        {client.prCount} PR
                      </Badge>
                    )}
                    <div className={cn('flex items-center gap-0.5 text-[10px]', trendColor)}>
                      <TrendIcon className="w-3 h-3" />
                      {client.trend !== 0 && (
                        <span className="tabular-nums">{client.trend > 0 ? '+' : ''}{Math.min(Math.abs(client.trend), 99)}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <Progress value={progressPercent} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground w-14 text-right tabular-nums">
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
