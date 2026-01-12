import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, ChevronRight } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';

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
  calculation: 'Počet = kolikrát byl cvik zaznamenán. Objem = Σ (série × opakování × váha) pro všechny záznamy daného cviku. Kliknutím přejdete na detail cviku.',
};

export function TopExercisesCard({ data, periodLabel, isLoading }: TopExercisesCardProps) {
  const navigate = useNavigate();
  const isEmpty = !data || data.length === 0;

  const periodBadge = (
    <span className="text-xs text-muted-foreground">{periodLabel}</span>
  );

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
      <ScrollArea className="h-[180px]">
        <div className="space-y-1 pr-3">
          {data.slice(0, 10).map((exercise, index) => (
            <div
              key={exercise.id}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors group"
              onClick={() => navigate(`/exercises/${exercise.id}`)}
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
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </AnalyticsCard>
  );
}
