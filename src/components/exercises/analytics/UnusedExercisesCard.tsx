import { useState } from 'react';
import { AnalyticsCard } from './AnalyticsCard';
import { Archive, Clock, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface UnusedExercise {
  id: string;
  name: string;
  lastUsedDate: string | null;
  daysSinceUse: number;
}

interface UnusedExercisesCardProps {
  data: UnusedExercise[];
  totalExercises?: number;
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Nepoužívané cviky',
  description: 'Cviky z knihovny, které nebyly použity v posledních 30 dnech.',
  calculation: 'Porovnání knihovny cviků s aktivními záznamy za období',
};

function formatDaysAgo(days: number): string {
  if (days === 0) return 'dnes';
  if (days === 1) return 'včera';
  if (days < 7) return `před ${days} dny`;
  if (days < 30) return `před ${Math.floor(days / 7)} týdny`;
  if (days < 365) return `před ${Math.floor(days / 30)} měsíci`;
  return 'více než rok';
}

export function UnusedExercisesCard({ data, totalExercises, isLoading }: UnusedExercisesCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isEmpty = !data || data.length === 0;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Sort by days since use (longest unused first)
  const sortedData = [...data].sort((a, b) => b.daysSinceUse - a.daysSinceUse);
  
  const usageRate = totalExercises && totalExercises > 0 
    ? Math.round(((totalExercises - data.length) / totalExercises) * 100) 
    : null;

  return (
    <AnalyticsCard
      title="Nepoužívané cviky"
      icon={Archive}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Všechny cviky jsou aktivně využívány! 💪"
    >
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {sortedData.slice(0, 5).map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id}>
              <button
                onClick={() => toggleExpand(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg text-left",
                  "bg-muted/30 hover:bg-muted/50 transition-colors",
                  "group cursor-pointer",
                  isExpanded && "bg-muted/50"
                )}
              >
                <div className="p-1.5 rounded-full bg-muted shrink-0">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.lastUsedDate ? formatDaysAgo(item.daysSinceUse) : 'nikdy nepoužito'}
                  </p>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
                  isExpanded && "rotate-180"
                )} />
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 ml-8 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Naposledy použit</span>
                        <span className="font-medium text-foreground">
                          {item.lastUsedDate ? formatDaysAgo(item.daysSinceUse) : 'nikdy'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Dní od použití</span>
                        <span className="font-medium text-foreground">
                          {item.lastUsedDate ? `${item.daysSinceUse} dní` : '—'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
        <span>
          {data.length} z {totalExercises || '?'} cviků nepoužito
        </span>
        {usageRate !== null && (
          <Badge variant={usageRate >= 70 ? 'success' : usageRate >= 40 ? 'warning' : 'destructive'} className="text-[9px]">
            {usageRate}% využití
          </Badge>
        )}
      </div>
    </AnalyticsCard>
  );
}
