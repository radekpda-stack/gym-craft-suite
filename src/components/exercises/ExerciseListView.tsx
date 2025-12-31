import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Dumbbell, Users, Activity, ChevronRight, Edit2, X, 
  CheckSquare, Square, Trophy, Clock, Archive, SortAsc, ChevronDown 
} from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { normalizeText, MOVEMENT_PATTERNS, DIFFICULTIES } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { BulkExerciseEditDialog } from '@/components/exercises/BulkExerciseEditDialog';
import { ExerciseFormDialog } from '@/components/exercises/ExerciseFormDialog';
import { ExerciseContextMenu } from '@/components/exercises/ExerciseContextMenu';
import { format, subDays } from 'date-fns';

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

const SORT_OPTIONS = [
  { value: 'alphabetical', label: 'Abecedně' },
  { value: 'most_used', label: 'Nejpoužívanější' },
  { value: 'most_clients', label: 'Nejvíce klientů' },
  { value: 'most_prs', label: 'Nejvíce PR' },
] as const;

interface Exercise {
  id: string;
  name: string;
  name_cs?: string;
  category: string;
  movement_pattern?: string;
  difficulty?: string;
  usageCount: number;
  clientCount: number;
  is_archived?: boolean;
  is_time_based?: boolean;
}

interface ExerciseListViewProps {
  exercises: Exercise[];
  isLoading: boolean;
}

export function ExerciseListView({ exercises, isLoading }: ExerciseListViewProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [patternFilter, setPatternFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('alphabetical');
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Bulk edit mode
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);

  // Edit/Duplicate dialogs
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [duplicateExercise, setDuplicateExercise] = useState<Exercise | null>(null);

  // Separate active and archived exercises
  const activeExercises = useMemo(() => exercises.filter(e => !e.is_archived), [exercises]);
  const archivedExercises = useMemo(() => exercises.filter(e => e.is_archived), [exercises]);

  // Get unique categories (only from active)
  const categories = useMemo(() => {
    const cats = new Set(activeExercises.map((e) => e.category));
    return Array.from(cats).sort();
  }, [activeExercises]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (patternFilter !== 'all') count++;
    if (difficultyFilter !== 'all') count++;
    return count;
  }, [categoryFilter, patternFilter, difficultyFilter]);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    
    return activeExercises.filter((exercise) => {
      if (normalizedQuery) {
        const name = normalizeText(exercise.name_cs || exercise.name);
        if (!name.includes(normalizedQuery)) return false;
      }
      if (categoryFilter !== 'all' && exercise.category !== categoryFilter) return false;
      if (patternFilter !== 'all' && exercise.movement_pattern !== patternFilter) return false;
      if (difficultyFilter !== 'all' && exercise.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [activeExercises, searchQuery, categoryFilter, patternFilter, difficultyFilter]);

  // Sort exercises
  const sortedExercises = useMemo(() => {
    const sorted = [...filteredExercises];
    switch (sortBy) {
      case 'most_used':
        sorted.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'most_clients':
        sorted.sort((a, b) => b.clientCount - a.clientCount);
        break;
      case 'alphabetical':
      default:
        sorted.sort((a, b) => (a.name_cs || a.name).localeCompare(b.name_cs || b.name, 'cs'));
        break;
    }
    return sorted;
  }, [filteredExercises, sortBy]);

  // Group by category
  const groupedExercises = useMemo(() => {
    const groups: Record<string, typeof sortedExercises> = {};
    sortedExercises.forEach((exercise) => {
      const cat = exercise.category || 'Ostatní';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(exercise);
    });
    return groups;
  }, [sortedExercises]);

  // Calculate category stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, { totalUsage: number; totalClients: number; hasPR: boolean }> = {};
    Object.entries(groupedExercises).forEach(([category, exs]) => {
      stats[category] = {
        totalUsage: exs.reduce((sum, e) => sum + e.usageCount, 0),
        totalClients: new Set(exs.flatMap(e => Array(e.clientCount).fill(e.id))).size, // Approximate
        hasPR: exs.some(e => e.usageCount > 0), // Simplified - assume PR exists if used
      };
    });
    return stats;
  }, [groupedExercises]);

  const [openCategories, setOpenCategories] = useState<string[]>([]);

  // Auto-expand all categories when searching or in bulk edit mode
  useEffect(() => {
    if (searchQuery.trim() || bulkEditMode) {
      setOpenCategories(Object.keys(groupedExercises));
    }
  }, [searchQuery, groupedExercises, bulkEditMode]);

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

  const selectAll = () => setSelectedIds(new Set(filteredExercises.map((e) => e.id)));
  const selectNone = () => setSelectedIds(new Set());

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
    <div className="space-y-4">
      {/* Bulk Edit Header */}
      {bulkEditMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-sm">
            {selectedIds.size} vybráno
          </Badge>
          <Button variant="outline" size="sm" onClick={selectAll} className="gap-1.5">
            <CheckSquare className="w-4 h-4" />
            Vše
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone} className="gap-1.5">
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
          <Button variant="ghost" size="sm" onClick={exitBulkEditMode}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'cs' ? 'Hledat cvik...' : 'Search exercise...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("shrink-0 relative", showFilters && 'bg-primary/10 border-primary')}
          >
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {!bulkEditMode && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setBulkEditMode(true)}
              className="shrink-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SortAsc className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Řazení" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        <Accordion type="multiple" value={openCategories} onValueChange={setOpenCategories} className="space-y-2">
          {Object.entries(groupedExercises)
            .sort(([a], [b]) => a.localeCompare(b, 'cs'))
            .map(([category, categoryExercises]) => {
              const selectedInCategory = categoryExercises.filter((e) => selectedIds.has(e.id)).length;
              const stats = categoryStats[category];
              
              return (
                <AccordionItem 
                  key={category} 
                  value={category}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1 flex-wrap">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-semibold text-base">{category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryExercises.length}
                      </Badge>
                      
                      {/* Category stats */}
                      {stats && stats.totalUsage > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {stats.totalUsage}× použito
                        </span>
                      )}
                      {stats && stats.totalUsage === 0 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Bez dat
                        </Badge>
                      )}

                      {bulkEditMode && selectedInCategory > 0 && (
                        <Badge variant="default" className="text-xs">
                          {selectedInCategory} vybráno
                        </Badge>
                      )}
                    </div>
                    {bulkEditMode && (
                      <div
                        role="button"
                        tabIndex={0}
                        className="mr-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectCategory(category);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            selectCategory(category);
                          }
                        }}
                      >
                        Vybrat vše
                      </div>
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
                                  {exercise.is_time_based && (
                                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  )}
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
                                <div className="flex items-center gap-1">
                                  <ExerciseContextMenu
                                    exercise={exercise as any}
                                    onEdit={() => setEditExercise(exercise as any)}
                                    onDuplicate={() => setDuplicateExercise(exercise as any)}
                                  />
                                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </div>
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

      {/* Archived Exercises Section */}
      {archivedExercises.length > 0 && (
        <Collapsible open={showArchived} onOpenChange={setShowArchived}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground mt-4">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                <span>Archivované cviky ({archivedExercises.length})</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showArchived && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {archivedExercises.map((exercise) => (
              <Card
                key={exercise.id}
                className="p-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => navigate(`/exercises/${exercise.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate text-sm">
                        {exercise.name_cs || exercise.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        Archivováno
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{exercise.category}</p>
                  </div>
                  <ExerciseContextMenu
                    exercise={exercise as any}
                    onEdit={() => setEditExercise(exercise as any)}
                    onDuplicate={() => setDuplicateExercise(exercise as any)}
                  />
                </div>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Bulk Edit Dialog */}
      <BulkExerciseEditDialog
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        selectedExercises={selectedExercises}
        onComplete={handleBulkEditComplete}
      />

      {/* Edit Exercise Dialog */}
      {editExercise && (
        <ExerciseFormDialog
          open={!!editExercise}
          onOpenChange={(open) => !open && setEditExercise(null)}
          exercise={editExercise as any}
        />
      )}

      {/* Duplicate Exercise Dialog */}
      {duplicateExercise && (
        <ExerciseFormDialog
          open={!!duplicateExercise}
          onOpenChange={(open) => !open && setDuplicateExercise(null)}
          exercise={duplicateExercise as any}
          onDuplicate
        />
      )}
    </div>
  );
}
