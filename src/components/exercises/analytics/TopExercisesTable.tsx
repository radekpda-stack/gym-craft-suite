import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import type { TopExerciseItem } from '@/hooks/useExerciseAnalyticsComplete';

interface TopExercisesTableProps {
  data: TopExerciseItem[];
  isLoading?: boolean;
  periodLabel: string;
}

const HELP_CONTENT = {
  title: 'Top cviky',
  description: 'Seznam 10 nejpoužívanějších cviků za zvolené období seřazených podle počtu použití.',
  calculation: 'Počítá se počet exercise_entries pro každý exercise_id',
};

export function TopExercisesTable({ data, isLoading, periodLabel }: TopExercisesTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (exerciseId: string) => {
    navigate(`/exercises/${exerciseId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Top cviky</CardTitle>
            <StatInfoTooltip
              title={HELP_CONTENT.title}
              description={HELP_CONTENT.description}
              calculation={HELP_CONTENT.calculation}
            />
          </div>
          <Badge variant="secondary" className="text-xs">
            {periodLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Žádná data pro zvolené období
          </p>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cvik</TableHead>
                  <TableHead className="text-center w-20">Použití</TableHead>
                  <TableHead className="text-center w-16">PR</TableHead>
                  <TableHead className="text-right w-24">Max váha</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((exercise, index) => (
                  <TableRow 
                    key={exercise.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(exercise.id)}
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-[200px]">
                          {exercise.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {exercise.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="tabular-nums">
                        {exercise.usageCount}×
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {exercise.prCount > 0 ? (
                        <Badge className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 tabular-nums">
                          {exercise.prCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {exercise.maxWeight ? (
                        <span className="font-medium">{exercise.maxWeight} kg</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
