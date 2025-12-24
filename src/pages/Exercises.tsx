import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Dumbbell, Users, Activity, ChevronRight, BarChart3, Edit2, X, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { normalizeText, MOVEMENT_PATTERNS, DIFFICULTIES } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { ExerciseLibraryStats } from '@/components/exercises/ExerciseLibraryStats';
import { BulkExerciseEditDialog } from '@/components/exercises/BulkExerciseEditDialog';

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
  diagonal_press: 'Diagonální tlak',
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
  
  // Bulk edit mode
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

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

  // Calculate which categories should be open (when searching or in bulk edit mode)
  const openCategories = useMemo(() => {
    if (searchQuery.trim() || bulkEditMode) {
      return Object.keys(groupedExercises);
    }
    return [];
  }, [searchQuery, groupedExercises, bulkEditMode]);

  // Get selected exercises for dialog
  const selectedExercises = useMemo(() => {
    return exercises.filter((e) => selectedIds.has(e.id));
  }, [exercises, selectedIds]);

  const handleExerciseClick = (exerciseId: string) => {
    if (bulkEditMode) {
      toggleSelection(exerciseId);
    } else {
      navigate(`/exercises/${exerciseId}`);
    }
  };

  const toggleSelection = (exerciseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredExercises.map((e) => e.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const selectCategory = (category: string) => {
    const categoryExercises = groupedExercises[category] || [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      categoryExercises.forEach((e) => next.add(e.id));
      return next;
    });
  };

  const exitBulkEditMode = () => {
    setBulkEditMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkEditComplete = () => {
    setShowBulkEditDialog(false);
    exitBulkEditMode();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Dumbbell className="w-6 h-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {language === 'cs' ? 'Knihovna cviků' : 'Exercise Library'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {bulkEditMode 
                ? `${selectedIds.size} vybráno z ${filteredExercises.length}`
                : language === 'cs' 
                  ? `${exercises.length} cviků v knihovně` 
                  : `${exercises.length} exercises in library`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bulkEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                Vše
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectNone}
                className="gap-1.5"
              >
                <Square className="w-4 h-4" />
                Nic
              </Button>
              <Button
                size="sm"
                onClick={() => setShowBulkEditDialog(true)}
                disabled={selectedIds.size === 0}
                className="gap-1.5"
              >
                <Edit2 className="w-4 h-4" />
                Upravit ({selectedIds.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exitBulkEditMode}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkEditMode(true)}
                className="gap-1.5"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden xs:inline">Hromadná úprava</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/exercises/analytics')}
                className="gap-1.5"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden xs:inline">Analytika</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn("gap-1.5", showFilters && 'bg-primary/10')}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden xs:inline">Filtry</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Statistics Section - hide in bulk edit mode */}
      {!bulkEditMode && <ExerciseLibraryStats />}

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

      {/* Exercise List with Accordion */}
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
        <Accordion 
          type="multiple" 
          value={openCategories}
          className="space-y-2"
        >
          {Object.entries(groupedExercises)
            .sort(([a], [b]) => a.localeCompare(b, 'cs'))
            .map(([category, categoryExercises]) => {
              const selectedInCategory = categoryExercises.filter((e) => selectedIds.has(e.id)).length;
              
              return (
                <AccordionItem 
                  key={category} 
                  value={category}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-semibold text-base">{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryExercises.length}
                      </Badge>
                      {bulkEditMode && selectedInCategory > 0 && (
                        <Badge variant="default" className="text-xs">
                          {selectedInCategory} vybráno
                        </Badge>
                      )}
                      {!bulkEditMode && categoryExercises.some(e => e.usageCount > 0) && (
                        <Activity className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>
                    {bulkEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectCategory(category);
                        }}
                      >
                        Vybrat vše
                      </Button>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="grid gap-2 pt-2">
                      {categoryExercises.map((exercise) => {
                        const isSelected = selectedIds.has(exercise.id);
                        
                        return (
                          <Card
                            key={exercise.id}
                            className={cn(
                              "p-3 hover:bg-muted/50 transition-colors cursor-pointer group border-muted",
                              bulkEditMode && isSelected && "bg-primary/10 border-primary"
                            )}
                            onClick={() => handleExerciseClick(exercise.id)}
                          >
                            <div className="flex items-center justify-between">
                              {bulkEditMode && (
                                <Checkbox
                                  checked={isSelected}
                                  className="mr-3"
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={() => toggleSelection(exercise.id)}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium truncate text-sm">
                                    {exercise.name_cs || exercise.name}
                                  </h3>
                                  {exercise.difficulty && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
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
                              {!bulkEditMode && (
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
        </Accordion>
      )}

      {/* Bulk Edit Dialog */}
      <BulkExerciseEditDialog
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        selectedExercises={selectedExercises}
        onComplete={handleBulkEditComplete}
      />
    </div>
  );
}
