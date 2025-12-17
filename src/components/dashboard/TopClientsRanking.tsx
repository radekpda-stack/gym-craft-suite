import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { cn } from '@/lib/utils';
import { Trophy, ChevronRight, ExternalLink } from 'lucide-react';
import { TopClientsModal } from './TopClientsModal';

export type ClientsPeriod = '30days' | '6months' | '12months';
type SortBy = 'count' | 'revenue';

interface TopClient {
  id: string;
  name: string;
  trainingsCount: number;
  revenue: number;
  unpaidAmount?: number;
  lastTraining?: string;
}

interface TopClientsRankingProps {
  clients: TopClient[];
  isLoading: boolean;
  period: ClientsPeriod;
  onPeriodChange: (period: ClientsPeriod) => void;
}

const PERIOD_OPTIONS: { value: ClientsPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
];

const PERIOD_LABELS: Record<ClientsPeriod, string> = {
  '30days': 'posledních 30 dní',
  '6months': 'posledních 6 měsíců',
  '12months': 'posledních 12 měsíců',
};

export function TopClientsRanking({
  clients,
  isLoading,
  period,
  onPeriodChange,
}: TopClientsRankingProps) {
  const [sortBy, setSortBy] = useState<SortBy>('count');
  const [showAllModal, setShowAllModal] = useState(false);

  const sortedClients = [...clients].sort((a, b) => {
    if (sortBy === 'count') return b.trainingsCount - a.trainingsCount;
    return b.revenue - a.revenue;
  });

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Nejčastější klienti
            </h3>
          </div>
          
          <div className="flex gap-1 p-1 rounded-full bg-secondary/50">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'rounded-full text-xs px-3 h-8',
                  period === opt.value && 'bg-primary text-primary-foreground'
                )}
                onClick={() => onPeriodChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Sort toggle */}
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'count' ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setSortBy('count')}
          >
            Podle tréninků
          </Button>
          <Button
            variant={sortBy === 'revenue' ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-8"
            onClick={() => setSortBy('revenue')}
          >
            Podle příjmu
          </Button>
        </div>

        {/* Ranking list */}
        <div className="space-y-2">
          {sortedClients.slice(0, 5).map((client, index) => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group"
            >
              {/* Rank badge */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                  index === 0 && 'bg-warning/20 text-warning',
                  index === 1 && 'bg-muted text-muted-foreground',
                  index === 2 && 'bg-orange-500/20 text-orange-500',
                  index > 2 && 'bg-secondary text-muted-foreground'
                )}
              >
                {index + 1}
              </div>

              {/* Client info */}
              <ClientAvatar name={client.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {client.trainingsCount} tréninků • {client.revenue.toLocaleString('cs-CZ')} Kč
                </p>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}

          {clients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Žádní klienti v tomto období</p>
            </div>
          )}
        </div>

        {/* View all button */}
        {clients.length > 5 && (
          <Button
            variant="ghost"
            className="w-full gap-2 text-primary hover:text-primary/80"
            onClick={() => setShowAllModal(true)}
          >
            <ExternalLink className="w-4 h-4" />
            Zobrazit vše ({clients.length})
          </Button>
        )}
      </div>

      {/* Full list modal */}
      <TopClientsModal
        open={showAllModal}
        onOpenChange={setShowAllModal}
        clients={clients}
        periodLabel={PERIOD_LABELS[period]}
      />
    </>
  );
}
