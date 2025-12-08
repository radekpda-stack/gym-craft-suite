import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  TrendingUp,
  Trophy,
  Dumbbell,
  Filter,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ProgressChart } from './ProgressChart';
import { ProgressList } from './ProgressList';
import { useExerciseEntries } from '@/hooks/useExerciseEntries';
import { exportProgressToPDF, exportProgressToCSV } from '@/lib/export';

type Period = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

interface ClientProgressTabProps {
  clientId: string;
  clientName: string;
}

export function ClientProgressTab({ clientId, clientName }: ClientProgressTabProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [period, setPeriod] = useState<Period>('month');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  
  const { entries, isLoading } = useExerciseEntries(clientId);

  // Get unique exercises
  const uniqueExercises = useMemo(() => {
    const exerciseMap = new Map<string, { count: number; lastDate: string; hasPR: boolean }>();
    entries.forEach((entry) => {
      const existing = exerciseMap.get(entry.exercise_name);
      if (existing) {
        existing.count++;
        if (entry.date > existing.lastDate) existing.lastDate = entry.date;
        if (entry.is_pr) existing.hasPR = true;
      } else {
        exerciseMap.set(entry.exercise_name, {
          count: 1,
          lastDate: entry.date,
          hasPR: entry.is_pr,
        });
      }
    });
    return Array.from(exerciseMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Filter entries by period
  const filteredEntries = useMemo(() => {
    if (period === 'all') return entries;
    
    const periodDays: Record<Period, number> = {
      week: 7,
      month: 30,
      '3months': 90,
      '6months': 180,
      year: 365,
      all: 0,
    };
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays[period]);
    
    return entries.filter((e) => new Date(e.date) >= cutoff);
  }, [entries, period]);

  // Get entries for a specific exercise
  const getExerciseEntries = (exerciseName: string) => {
    return filteredEntries.filter((e) => e.exercise_name === exerciseName);
  };

  // Count PRs
  const prsCount = useMemo(() => entries.filter((e) => e.is_pr).length, [entries]);

  const handleExportPDF = () => {
    exportProgressToPDF({ clientName, entries: filteredEntries });
  };

  const handleExportCSV = () => {
    exportProgressToCSV({ clientName, entries: filteredEntries });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Načítám data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            <span className="font-semibold">{entries.length}</span>
            <span className="text-muted-foreground text-sm">záznamů</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="font-semibold">{uniqueExercises.length}</span>
            <span className="text-muted-foreground text-sm">cviků</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-semibold">{prsCount}</span>
            <span className="text-muted-foreground text-sm">PR</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Období</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Týden</SelectItem>
                  <SelectItem value="month">Měsíc</SelectItem>
                  <SelectItem value="3months">3 měsíce</SelectItem>
                  <SelectItem value="6months">6 měsíců</SelectItem>
                  <SelectItem value="year">Rok</SelectItem>
                  <SelectItem value="all">Vše</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Cvik pro graf</label>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte cvik" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueExercises.map((exercise) => (
                    <SelectItem key={exercise.name} value={exercise.name}>
                      {exercise.name}
                      {exercise.hasPR && ' 🏆'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart for selected exercise */}
      {selectedExercise && (
        <ProgressChart
          clientId={clientId}
          exerciseName={selectedExercise}
          clientName={clientName}
          period={period === 'all' ? 'year' : period === '6months' ? '3months' : period}
        />
      )}

      {/* Exercise list with expandable history */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Přehled cviků ({filteredEntries.length} záznamů)
        </h3>

        {uniqueExercises.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-12 text-center">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Zatím žádné tréninkové záznamy
              </p>
            </CardContent>
          </Card>
        ) : (
          uniqueExercises.map((exercise) => {
            const exerciseEntries = getExerciseEntries(exercise.name);
            const isExpanded = expandedExercise === exercise.name;

            return (
              <Collapsible
                key={exercise.name}
                open={isExpanded}
                onOpenChange={() =>
                  setExpandedExercise(isExpanded ? null : exercise.name)
                }
              >
                <Card className="glass-subtle">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-base">
                            {exercise.name}
                          </CardTitle>
                          {exercise.hasPR && (
                            <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
                              <Trophy className="w-3 h-3" /> PR
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">
                            {exerciseEntries.length} záznamů
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Poslední:{' '}
                            {format(new Date(exercise.lastDate), 'd.M.yyyy', {
                              locale: cs,
                            })}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ProgressList
                        entries={exerciseEntries}
                        showClient={false}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
