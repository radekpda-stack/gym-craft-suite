import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PackageOpen, ChevronRight } from 'lucide-react';

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-primary" />
            Nevyužité cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-medium">Nevyužité cviky</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
            Všechny cviky využity
          </div>
        ) : (
          <ScrollArea className="h-[140px]">
            <div className="space-y-1 pr-3">
              {data.slice(0, 10).map((exercise) => (
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
              {data.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{data.length - 10} dalších
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
