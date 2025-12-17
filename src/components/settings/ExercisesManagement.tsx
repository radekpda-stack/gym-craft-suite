import { useState, useMemo } from 'react';
import { Plus, Search, Dumbbell, Filter, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  useExercises, 
  Exercise,
  normalizeText,
  MOVEMENT_PATTERNS,
  DIFFICULTIES,
  EQUIPMENT_OPTIONS,
  SOURCES,
} from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { ExerciseFormDialog } from './exercises/ExerciseFormDialog';

// Labels for UI
export const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  squat: 'Dřep',
  hinge: 'Hip hinge',
  lunge: 'Výpad',
  push_horizontal: 'Tlak horizontální',
  push_vertical: 'Tlak vertikální',
  pull_horizontal: 'Tah horizontální',
  pull_vertical: 'Tah vertikální',
  carry: 'Přenášení',
  core_anti_extension: 'Core anti-extenze',
  core_anti_rotation: 'Core anti-rotace',
  core_anti_lateral_flexion: 'Core anti-laterální flexe',
  rotation: 'Rotace',
  locomotion: 'Lokomoce',
  conditioning: 'Kondice',
  mobility: 'Mobilita',
  other: 'Ostatní',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Začátečník',
  intermediate: 'Pokročilý',
  advanced: 'Expert',
};

export const SOURCE_LABELS: Record<string, string> = {
  system: 'Systémový',
  custom: 'Vlastní',
  import: 'Importovaný',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  bodyweight: 'Vlastní váha',
  barbell: 'Činka',
  dumbbell: 'Jednoruční činka',
  kettlebell: 'Kettlebell',
  cable: 'Kladka',
  machine: 'Stroj',
  bands: 'Gumy',
  bench: 'Lavice',
  pullup_bar: 'Hrazda',
  rings: 'Kruhy',
  trx: 'TRX',
  box: 'Box',
  medicine_ball: 'Medicinbal',
  slam_ball: 'Slam ball',
  rower: 'Veslovačka',
  ski_erg: 'Ski erg',
  treadmill: 'Běžecký pás',
  treadmill_sled_mode: 'Pás - sled mode',
  sled: 'Sáně',
  landmine: 'Landmine',
  hex_bar: 'Hex bar',
  plyo_platform: 'Plyo platforma',
  other: 'Ostatní',
};

interface Filters {
  movementPattern: string | null;
  difficulty: string | null;
  equipment: string[];
  source: string | null;
  showArchived: boolean;
}

export function ExercisesManagement() {
  const { exercises, isLoading, archiveExercise } = useExercises();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    movementPattern: null,
    difficulty: null,
    equipment: [],
    source: null,
    showArchived: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    
    return exercises.filter((exercise) => {
      // Archive filter
      if (!filters.showArchived && exercise.is_archived) return false;
      if (filters.showArchived && !exercise.is_archived) return false;

      // Search (uses normalized search_name or falls back to name)
      if (normalizedQuery) {
        const searchTarget = normalizeText(exercise.search_name || exercise.name_cs || exercise.name);
        if (!searchTarget.includes(normalizedQuery)) return false;
      }

      // Movement pattern filter
      if (filters.movementPattern && exercise.movement_pattern !== filters.movementPattern) return false;

      // Difficulty filter
      if (filters.difficulty && exercise.difficulty !== filters.difficulty) return false;

      // Source filter
      if (filters.source && exercise.source !== filters.source) return false;

      // Equipment filter (any match)
      if (filters.equipment.length > 0) {
        const hasEquipment = filters.equipment.some(eq => 
          exercise.equipment?.includes(eq)
        );
        if (!hasEquipment) return false;
      }

      return true;
    });
  }, [exercises, searchQuery, filters]);

  // Group by category
  const groupedExercises = useMemo(() => {
    return filteredExercises.reduce((acc, exercise) => {
      const category = exercise.category || 'Ostatní';
      if (!acc[category]) acc[category] = [];
      acc[category].push(exercise);
      return acc;
    }, {} as Record<string, Exercise[]>);
  }, [filteredExercises]);

  const openCreateDialog = () => {
    setEditingExercise(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsDialogOpen(true);
  };

  const handleArchive = (exercise: Exercise) => {
    archiveExercise.mutate({ id: exercise.id, archived: !exercise.is_archived });
  };

  const activeFiltersCount = [
    filters.movementPattern,
    filters.difficulty,
    filters.source,
    filters.equipment.length > 0,
  ].filter(Boolean).length;

  if (isLoading) {
    return <div className="text-muted-foreground">Načítání cviků...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat cviky (bez diakritiky)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>
        
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtry
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
          )}
        </Button>

        <Button
          variant={filters.showArchived ? 'secondary' : 'outline'}
          onClick={() => setFilters(f => ({ ...f, showArchived: !f.showArchived }))}
          className="gap-2"
        >
          <Archive className="w-4 h-4" />
          {filters.showArchived ? 'Archivované' : 'Aktivní'}
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat cvik
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
            <ExerciseFormDialog 
              exercise={editingExercise}
              onClose={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-subtle rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Movement Pattern */}
            <div className="space-y-2">
              <Label>Pohybový vzor</Label>
              <Select
                value={filters.movementPattern || 'all'}
                onValueChange={(v) => setFilters(f => ({ ...f, movementPattern: v === 'all' ? null : v }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Vše" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vše</SelectItem>
                  {MOVEMENT_PATTERNS.map(pattern => (
                    <SelectItem key={pattern} value={pattern}>
                      {MOVEMENT_PATTERN_LABELS[pattern] || pattern}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label>Obtížnost</Label>
              <Select
                value={filters.difficulty || 'all'}
                onValueChange={(v) => setFilters(f => ({ ...f, difficulty: v === 'all' ? null : v }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Vše" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vše</SelectItem>
                  {DIFFICULTIES.map(diff => (
                    <SelectItem key={diff} value={diff}>
                      {DIFFICULTY_LABELS[diff] || diff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label>Zdroj</Label>
              <Select
                value={filters.source || 'all'}
                onValueChange={(v) => setFilters(f => ({ ...f, source: v === 'all' ? null : v }))}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Vše" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vše</SelectItem>
                  {SOURCES.map(source => (
                    <SelectItem key={source} value={source}>
                      {SOURCE_LABELS[source] || source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equipment Multi-select */}
            <div className="space-y-2">
              <Label>Vybavení</Label>
              <Select
                value={filters.equipment.length > 0 ? filters.equipment[0] : 'all'}
                onValueChange={(v) => {
                  if (v === 'all') {
                    setFilters(f => ({ ...f, equipment: [] }));
                  } else {
                    setFilters(f => ({ 
                      ...f, 
                      equipment: f.equipment.includes(v) 
                        ? f.equipment.filter(e => e !== v)
                        : [...f.equipment, v]
                    }));
                  }
                }}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Vše">
                    {filters.equipment.length > 0 
                      ? `${filters.equipment.length} vybráno` 
                      : 'Vše'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Vše</SelectItem>
                  {EQUIPMENT_OPTIONS.map(eq => (
                    <SelectItem key={eq} value={eq}>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          checked={filters.equipment.includes(eq)}
                          className="pointer-events-none"
                        />
                        {EQUIPMENT_LABELS[eq] || eq}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({
                movementPattern: null,
                difficulty: null,
                equipment: [],
                source: null,
                showArchived: filters.showArchived,
              })}
            >
              Vymazat filtry
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Zobrazeno {filteredExercises.length} z {exercises.length} cviků
        {filters.showArchived && ' (archivované)'}
      </div>

      {/* Exercises List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1">
              {category} ({categoryExercises.length})
            </h4>
            <div className="space-y-2">
              {categoryExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className={cn(
                    "glass-subtle rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:bg-secondary/50 transition-colors",
                    exercise.is_archived && "opacity-60"
                  )}
                  onClick={() => openEditDialog(exercise)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {exercise.name_cs || exercise.name}
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {exercise.movement_pattern && (
                          <Badge variant="outline" className="text-xs">
                            {MOVEMENT_PATTERN_LABELS[exercise.movement_pattern] || exercise.movement_pattern}
                          </Badge>
                        )}
                        {exercise.difficulty && (
                          <Badge variant="secondary" className="text-xs">
                            {DIFFICULTY_LABELS[exercise.difficulty]}
                          </Badge>
                        )}
                        {exercise.is_unilateral && (
                          <Badge variant="secondary" className="text-xs">Unilaterální</Badge>
                        )}
                        {exercise.is_bodyweight && (
                          <Badge variant="secondary" className="text-xs">Bodyweight</Badge>
                        )}
                        {exercise.source === 'system' && (
                          <Badge className="text-xs bg-blue-500/20 text-blue-400">Systémový</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(exercise);
                      }}
                    >
                      {exercise.is_archived ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredExercises.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Žádné cviky nenalezeny</p>
          </div>
        )}
      </div>
    </div>
  );
}
