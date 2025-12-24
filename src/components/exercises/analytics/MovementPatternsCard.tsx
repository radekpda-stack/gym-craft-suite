import { Layers } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MovementPatternItem {
  pattern: string;
  label: string;
  count: number;
  totalEntries?: number;
  coverage?: number;
}

interface MovementPatternsCardProps {
  data: MovementPatternItem[];
  coverage?: number;
  totalEntries?: number;
  isLoading?: boolean;
}

const PATTERN_COLORS: Record<string, string> = {
  squat: 'bg-blue-500',
  hinge: 'bg-purple-500',
  push: 'bg-orange-500',
  pull: 'bg-green-500',
  carry: 'bg-cyan-500',
  rotation: 'bg-rose-500',
  core: 'bg-violet-500',
  lunge: 'bg-pink-500',
  locomotion: 'bg-teal-500',
  conditioning: 'bg-red-500',
  mobility: 'bg-sky-500',
};

export function MovementPatternsCard({ data, coverage = 100, totalEntries = 0, isLoading }: MovementPatternsCardProps) {
  const isEmpty = !data || data.length === 0;
  const maxCount = Math.max(...(data?.map(d => d.count) || [1]), 1);
  const totalCounted = data?.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <AnalyticsCard
      title="Pohybové vzorce"
      icon={Layers}
      isLoading={isLoading}
      isEmpty={isEmpty}
    >
      <div className="h-[180px] flex flex-col justify-center space-y-2">
        {coverage < 100 && totalEntries > 0 && (
          <div className="text-xs text-muted-foreground mb-2">
            Data z {coverage}% záznamů ({totalCounted} z {totalEntries})
          </div>
        )}
        {data?.slice(0, 6).map((item) => {
          const width = Math.round((item.count / maxCount) * 100);
          const colorClass = PATTERN_COLORS[item.pattern] || PATTERN_COLORS[item.label.toLowerCase()] || 'bg-primary';
          
          return (
            <TooltipProvider key={item.pattern}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="group cursor-default">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.count}×
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colorClass} rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <p>{item.count} záznamů</p>
                  <p className="text-muted-foreground">
                    {totalCounted > 0 ? Math.round((item.count / totalCounted) * 100) : 0}% z celku
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </AnalyticsCard>
  );
}
