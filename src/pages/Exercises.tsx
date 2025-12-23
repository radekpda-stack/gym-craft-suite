import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Dumbbell, Users, Activity, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { normalizeText, MOVEMENT_PATTERNS, DIFFICULTIES } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';

const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
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

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Začátečník',
  intermediate: 'Pokročilý',
  advanced: 'Expert',
};

export default function Exercises() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [patternFilter, setPatternFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data: exercises = [], isLoading } = useExercisesWithUsage();

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(exercises.map((e) => e.category));
    return Array.from(cats).sort();
  }, [exercises]);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    
    return exercises.filter((exercise) => {
      // Search filter
      if (normalizedQuery) {
        const name = normalizeText(exercise.name_cs || exercise.name);
        if (!name.includes(normalizedQuery)) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && exercise.category !== categoryFilter) return false;

      // Movement pattern filter
      if (patternFilter !== 'all' && exercise.movement_pattern !== patternFilter) return false;

      // Difficulty filter
      if (difficultyFilter !== 'all' && exercise.difficulty !== difficultyFilter) return false;

      return true;
    });
  }, [exercises, searchQuery, categoryFilter, patternFilter, difficultyFilter]);

  // Group by category
  const groupedExercises = useMemo(() => {
    const groups: Record<string, typeof filteredExercises> = {};
    filteredExercises.forEach((exercise) => {
      const cat = exercise.category || 'Ostatní';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(exercise);
    });
    return groups;
  }, [filteredExercises]);

  const handleExerciseClick = (exerciseId: string) => {
    navigate(`/exercises/${exerciseId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            {language === 'cs' ? 'Knihovna cviků' : 'Exercise Library'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {language === 'cs' 
              ? `${exercises.length} cviků v knihovně` 
              : `${exercises.length} exercises in library`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-primary/10')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtry
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === 'cs' ? 'Hledat cvik...' : 'Search exercise...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny kategorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={patternFilter} onValueChange={setPatternFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Pohybový vzorec" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny vzorce</SelectItem>
                {MOVEMENT_PATTERNS.map((pattern) => (
                  <SelectItem key={pattern} value={pattern}>
                    {MOVEMENT_PATTERN_LABELS[pattern] || pattern}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Obtížnost" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny obtížnosti</SelectItem>
                {DIFFICULTIES.map((diff) => (
                  <SelectItem key={diff} value={diff}>
                    {DIFFICULTY_LABELS[diff] || diff}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Exercise List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{language === 'cs' ? 'Žádné cviky nenalezeny' : 'No exercises found'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExercises).map(([category, exercises]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {category}
                <Badge variant="secondary" className="ml-2">{exercises.length}</Badge>
              </h2>
              <div className="grid gap-2">
                {exercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleExerciseClick(exercise.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">
                            {exercise.name_cs || exercise.name}
                          </h3>
                          {exercise.difficulty && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {exercise.movement_pattern && (
                            <span>
                              {MOVEMENT_PATTERN_LABELS[exercise.movement_pattern] || exercise.movement_pattern}
                            </span>
                          )}
                          {exercise.usageCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {exercise.usageCount}×
                            </span>
                          )}
                          {exercise.clientCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {exercise.clientCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
