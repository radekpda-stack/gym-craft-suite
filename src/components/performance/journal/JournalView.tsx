import { useState, useMemo } from 'react';
import {
  ExternalLink, Plus, Dumbbell, Heart, Zap, ArrowLeft, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientAllExercises, type ClientExerciseProgress } from '@/hooks/useClientAllExercises';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ExerciseListItem } from './ExerciseListItem';
import { ExerciseDetailView } from './ExerciseDetailView';
import { WeekStrip } from './WeekStrip';

type ExerciseFilter = 'all' | 'strength' | 'cardio' | 'skill';

interface JournalViewProps {
  clientId: string;
  clientName: string;
  onBack: () => void;
  onNavigateToClient: () => void;
  onQuickLog: () => void;
}

export function JournalView({ clientId, clientName, onBack, onNavigateToClient, onQuickLog }: JournalViewProps) {
  const [filter, setFilter] = useState<ExerciseFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<ClientExerciseProgress | null>(null);
  const [quickLogExerciseName, setQuickLogExerciseName] = useState<string | undefined>();

  const { data: exercises = [], isLoading } = useClientAllExercises(clientId, 24);

  const filtered = useMemo(() => {
    let list = exercises;
    if (filter !== 'all') list = list.filter(e => e.exerciseType === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.exerciseName.toLowerCase().includes(q));
    }
    return list;
  }, [exercises, filter, search]);

  const strengthCount = exercises.filter(e => e.exerciseType === 'strength').length;
  const cardioCount = exercises.filter(e => e.exerciseType === 'cardio').length;
  const skillCount = exercises.filter(e => e.exerciseType === 'skill').length;

  const handleQuickLog = (exerciseName?: string) => {
    setQuickLogExerciseName(exerciseName);
    onQuickLog();
  };

  if (selectedExercise) {
    return (
      <ExerciseDetailView
        clientId={clientId}
        clientName={clientName}
        exercise={selectedExercise}
        onBack={() => setSelectedExercise(null)}
        onQuickLog={handleQuickLog}
      />
    );
  }

  return (
    <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Client bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{clientName}</p>
          <p className="text-xs text-muted-foreground">
            {exercises.length} cviků · {exercises.reduce((s, e) => s + e.count, 0)} záznamů
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onNavigateToClient} className="shrink-0 gap-1 h-8">
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Karta</span>
        </Button>
        <Button size="sm" onClick={() => handleQuickLog()} className="shrink-0 gap-1 h-8">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Zapsat</span>
        </Button>
      </div>

      <WeekStrip clientId={clientId} />

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {([
          ['all', 'Vše', null],
          ['strength', 'Síla', strengthCount],
          ['cardio', 'Kardio', cardioCount],
          ['skill', 'Plyo', skillCount],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all",
              filter === value
                ? value === 'all' ? 'bg-foreground text-background'
                : value === 'cardio' ? 'bg-success text-white'
                : value === 'skill' ? 'bg-warning text-black'
                : 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {value === 'strength' && <Dumbbell className="w-3 h-3" />}
            {value === 'cardio' && <Heart className="w-3 h-3" />}
            {value === 'skill' && <Zap className="w-3 h-3" />}
            {label}
            {count !== null && count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Hledat cvik..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Dumbbell className="w-7 h-7 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {exercises.length === 0 ? 'Zatím žádné záznamy' : 'Žádné výsledky'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {exercises.length === 0 ? 'Zapište první výkon pomocí tlačítka + Zapsat' : 'Zkuste jiný filtr nebo hledaný výraz'}
            </p>
          </div>
          {exercises.length === 0 && (
            <button onClick={() => onQuickLog()} className="text-xs font-semibold text-primary underline underline-offset-2">
              + Zapsat první výkon
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(exercise => (
            <ExerciseListItem key={exercise.exerciseName} exercise={exercise} onClick={() => setSelectedExercise(exercise)} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
