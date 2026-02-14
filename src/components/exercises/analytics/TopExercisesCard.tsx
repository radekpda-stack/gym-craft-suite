import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, ChevronDown } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TopExercise {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  totalVolume: number;
}

interface TopExercisesCardProps {
  data: TopExercise[];
  periodLabel: string;
  isLoading?: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M kg`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k kg`;
  return `${Math.round(value)} kg`;
}

const HELP_CONTENT = {
  title: 'Top cviky',
  description: 'Žebříček nejčastěji používaných cviků za zvolené období. Zobrazuje počet záznamů a celkový objem pro každý cvik.',
  calculation: 'Počet = kolikrát byl cvik zaznamenán. Objem = Σ (série × opakování × váha) pro všechny záznamy daného cviku.',
};

export function TopExercisesCard({ data, periodLabel, isLoading }: TopExercisesCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isEmpty = !data || data.length === 0;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const periodBadge = (
    <span className="text-xs text-muted-foreground">{periodLabel}</span>
  );

  const maxUsage = data.length > 0 ? Math.max(...data.map(e => e.usageCount)) : 1;

  return (
    <AnalyticsCard
      title="Top cviky"
      icon={Trophy}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Zatím žádná data o cvicích"
      actions={periodBadge}
      className="md:col-span-2"
      helpContent={HELP_CONTENT}
    >
      <ScrollArea className="h-[200px]">
        <div className="space-y-1 pr-3">
          {data.slice(0, 10).map((exercise, index) => {
            const isExpanded = expandedId === exercise.id;
            return (
              <div key={exercise.id}>
                <div
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => toggleExpand(exercise.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`text-xs font-bold w-5 text-center ${
                      index === 0 ? 'text-amber-500' : 
                      index === 1 ? 'text-slate-400' : 
                      index === 2 ? 'text-amber-700' : 'text-muted-foreground'
                    }`}>
                      {index + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{exercise.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {exercise.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-medium">{exercise.usageCount}×</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatVolume(exercise.totalVolume)}
                      </p>
                    </div>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 py-2 ml-8 space-y-2 text-[11px]">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Celkový objem</span>
                          <span className="font-medium text-foreground">{formatVolume(exercise.totalVolume)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Počet záznamů</span>
                          <span className="font-medium text-foreground">{exercise.usageCount}×</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Kategorie</span>
                          <span className="font-medium text-foreground">{exercise.category}</span>
                        </div>
                        {/* Usage bar */}
                        <div className="pt-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/40"
                              style={{ width: `${(exercise.usageCount / maxUsage) * 100}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            Relativní využití oproti #{data[0]?.name}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </AnalyticsCard>
  );
}
