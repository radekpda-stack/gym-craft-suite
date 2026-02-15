import { AnalyticsCard } from './AnalyticsCard';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClientProgress {
  clientId: string;
  clientName: string;
  avgWeightFirst: number;
  avgWeightSecond: number;
  improvement: number; // percentage
  entryCount: number;
  frequency: number;
}

interface Props {
  data: ClientProgress[];
  isLoading: boolean;
}

export function ClientProgressLeaderboardCard({ data, isLoading }: Props) {
  return (
    <AnalyticsCard
      title="Žebříček pokroku klientů"
      icon={Trophy}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Nedostatek dat pro srovnání"
      helpContent={{
        title: 'Žebříček pokroku klientů',
        description: 'Řazení klientů podle skutečného zlepšení průměrné váhy mezi 1. a 2. polovinou období.',
        calculation: 'Zlepšení = (Ø váha 2. polovina - Ø váha 1. polovina) / Ø váha 1. polovina × 100',
      }}
    >
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {data.map((client, i) => {
          const TrendIcon = client.improvement > 0 ? TrendingUp : client.improvement < 0 ? TrendingDown : Minus;
          return (
            <div
              key={client.clientId}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 border border-border/30"
            >
              <span className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                i < 3 ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{client.clientName}</p>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>{client.entryCount} zázn.</span>
                  <span>{client.frequency.toFixed(1)}×/týd</span>
                  <span>Ø {client.avgWeightSecond.toFixed(1)} kg</span>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                client.improvement > 0 && "text-emerald-600 bg-emerald-500/10",
                client.improvement < 0 && "text-red-500 bg-red-500/10",
                client.improvement === 0 && "text-muted-foreground bg-muted/30"
              )}>
                <TrendIcon className="w-3 h-3" />
                {client.improvement > 0 ? '+' : ''}{client.improvement.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsCard>
  );
}
