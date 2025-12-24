import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PackageOpen, ChevronRight } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';

interface UnusedExercise {
  id: string;
  name: string;
  category: string;
  lastUsed: string | null;
}

interface UnusedExercisesCardProps {
  data: UnusedExercise[];
  periodLabel: string;
  isLoading?: boolean;
}

export function UnusedExercisesCard({ data, periodLabel, isLoading }: UnusedExercisesCardProps) {
  const navigate = useNavigate();
  const isEmpty = !data || data.length === 0;

  const periodBadge = (
    <span className="text-xs text-muted-foreground">{periodLabel}</span>
  );

  return (
    <AnalyticsCard
      title="Nevyužité cviky"
      icon={PackageOpen}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Všechny cviky využity"
      actions={periodBadge}
      className="md:col-span-2"
    >
      <ScrollArea className="h-[180px]">
        <div className="space-y-1 pr-3">
          {data.slice(0, 12).map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors group"
              onClick={() => navigate(`/exercises/${exercise.id}`)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{exercise.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {exercise.category}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </div>
          ))}
          {data.length > 12 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              +{data.length - 12} dalších
            </p>
          )}
        </div>
      </ScrollArea>
    </AnalyticsCard>
  );
}
