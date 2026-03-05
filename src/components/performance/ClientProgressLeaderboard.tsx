import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, ChevronRight, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

const RANK_CONFIG = [
  { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', ring: 'ring-yellow-500/20' },
  { color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30', ring: 'ring-gray-400/20' },
  { color: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/30', ring: 'ring-amber-600/20' },
];

export function ClientProgressLeaderboard({ topClients, isLoading }: ClientProgressLeaderboardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (topClients.length === 0) {
    return (
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-sm">Top aktivní klienti</h3>
          <Badge variant="secondary" className="text-[10px]">30 dní</Badge>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Zatím žádné záznamy v tomto období
        </p>
      </div>
    );
  }

  const top3 = topClients.slice(0, 3);

  return (
    <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-sm">Top klienti</h3>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">30 dní</Badge>
        </div>
        <button
          onClick={() => navigate('/clients')}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-0.5"
        >
          Více <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontal top 3 cards */}
      <div className="grid grid-cols-3 gap-2">
        {top3.map((client, index) => {
          const rank = RANK_CONFIG[index];
          const TrendIcon = client.trend > 0 ? TrendingUp : client.trend < 0 ? TrendingDown : Minus;
          
          return (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className={cn(
                'relative flex flex-col items-center text-center p-3 rounded-xl',
                'bg-background/60 border shadow-sm',
                rank.border,
                'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
                'focus:outline-none'
              )}
            >
              {/* Rank medal */}
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center mb-1.5', rank.bg)}>
                <Medal className={cn('w-4 h-4', rank.color)} />
              </div>
              
              {/* Name */}
              <p className="text-xs font-semibold text-foreground truncate w-full leading-tight">
                {client.name.split(' ')[0]}
              </p>
              
              {/* Stats */}
              <p className="text-lg font-bold tabular-nums text-foreground leading-tight mt-1">
                {client.entriesCount}
              </p>
              <p className="text-[9px] text-muted-foreground">zázn.</p>

              {client.prCount > 0 && (
                <div className="flex items-center gap-0.5 mt-1">
                  <Trophy className="w-2.5 h-2.5 text-warning" />
                  <span className="text-[9px] font-semibold text-warning">{client.prCount} PR</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
