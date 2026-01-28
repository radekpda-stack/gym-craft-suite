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

const RANK_COLORS = [
  'text-yellow-500', // 1st
  'text-gray-400',   // 2nd
  'text-amber-600',  // 3rd
  'text-muted-foreground',
  'text-muted-foreground',
];

export function ClientProgressLeaderboard({ topClients, isLoading }: ClientProgressLeaderboardProps) {
  const navigate = useNavigate();

  // Calculate max entries for progress bar
  const maxEntries = Math.max(...topClients.map((c) => c.entriesCount), 1);

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4 space-y-4">
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
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">Top aktivní klienti</h3>
          <Badge variant="secondary" className="text-xs">30 dní</Badge>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          Zatím žádné záznamy v tomto období
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-foreground">Top aktivní klienti</h3>
          <Badge variant="secondary" className="text-xs">30 dní</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1"
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
          const trendColor = client.trend > 0 ? 'text-success' : client.trend < 0 ? 'text-destructive' : 'text-muted-foreground';

          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg',
                'bg-background/50 hover:bg-muted/50 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                'text-left'
              )}
            >
              {/* Rank */}
              <div className={cn('w-6 text-center font-bold', RANK_COLORS[index] || 'text-muted-foreground')}>
                {index < 3 ? (
                  <Medal className={cn('w-5 h-5 mx-auto', RANK_COLORS[index])} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Client info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-medium text-foreground truncate">
                    {client.name}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {client.prCount > 0 && (
                      <Badge variant="outline" className="text-xs text-warning border-warning/30">
                        {client.prCount} PR
                      </Badge>
                    )}
                    <div className={cn('flex items-center gap-0.5 text-xs', trendColor)}>
                      <TrendIcon className="w-3 h-3" />
                      {client.trend !== 0 && (
                        <span>{client.trend > 0 ? '+' : ''}{client.trend}%</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <Progress value={progressPercent} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground w-16 text-right">
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
