import { AnalyticsCard } from './AnalyticsCard';
import { Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SkillClientStats } from '@/hooks/useClientSkillComparison';

interface Props {
  data: SkillClientStats[];
  isLoading: boolean;
}

export function SkillClientComparisonCard({ data, isLoading }: Props) {
  return (
    <AnalyticsCard
      title="Skill/Plyo: srovnání klientů"
      icon={Zap}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Žádná skill/plyo data"
      helpContent={{
        title: 'Skill/Plyo srovnání klientů',
        description: 'Počet záznamů a unikátních cviků za zvolené období pro každého klienta.',
      }}
    >
      <ScrollArea className="h-[240px]">
        <div className="space-y-2">
          {data.slice(0, 15).map((c) => (
            <div key={c.clientId} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background/60 border border-border/30">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.clientName}</p>
              </div>
              <div className="flex gap-4 text-xs shrink-0">
                <div className="text-center">
                  <p className="font-medium">{c.entryCount}</p>
                  <p className="text-[9px] text-muted-foreground">zázn.</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{c.uniqueExercises}</p>
                  <p className="text-[9px] text-muted-foreground">cviků</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </AnalyticsCard>
  );
}
