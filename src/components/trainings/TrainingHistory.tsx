/**
 * Training History Component
 * 
 * Displays filterable and searchable history of completed trainings for a client.
 * Features:
 * - Date range filtering (1m, 3m, 6m, 1y, all)
 * - Tag-based filtering with multi-select
 * - Full-text search in notes and tags
 * - Inline editing of training notes and tags
 */

import { useState, useMemo, useCallback } from "react";
import { format, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  Tag, 
  X, 
  Edit2, 
  FileText,
  Search 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { 
  useClientTrainingHistory, 
  useUpdateTrainingSessionTags,
  TrainingWithTags 
} from "@/hooks/useTrainingSessionTags";
import { useTags, Tag as TagType } from "@/hooks/useTags";
import { useUpdateTrainingSession } from "@/hooks/useTrainingSessions";
import { TrainingTagsSelector } from "./TrainingTagsSelector";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface TrainingHistoryProps {
  /** Client ID to display training history for */
  clientId: string;
}

type DateRangeOption = "all" | "1m" | "3m" | "6m" | "1y";

interface EditingState {
  training: TrainingWithTags;
  notes: string;
  tagIds: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Date range options for filtering */
const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "1m", label: "Poslední měsíc" },
  { value: "3m", label: "Poslední 3 měsíce" },
  { value: "6m", label: "Poslední 6 měsíců" },
  { value: "1y", label: "Poslední rok" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates the start date based on the selected range option
 */
const getStartDateFromRange = (range: DateRangeOption): Date | null => {
  if (range === "all") return null;
  
  const now = new Date();
  const monthsMap: Record<Exclude<DateRangeOption, "all">, number> = {
    "1m": 1,
    "3m": 3,
    "6m": 6,
    "1y": 12,
  };
  
  return subMonths(now, monthsMap[range]);
};

// ============================================================================
// Component
// ============================================================================

export function TrainingHistory({ clientId }: TrainingHistoryProps) {
  // Data fetching
  const { data: trainings = [], isLoading } = useClientTrainingHistory(clientId);
  const { data: allTags = [] } = useTags();
  const updateTags = useUpdateTrainingSessionTags();
  const updateTraining = useUpdateTrainingSession();
  
  // Filter state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit state
  const [editingState, setEditingState] = useState<EditingState | null>(null);

  // ========================================
  // Memoized Values
  // ========================================

  /** Filtered trainings based on all active filters */
  const filteredTrainings = useMemo(() => {
    let result = trainings;

    // Filter to only completed trainings
    result = result.filter(t => t.status === "completed");

    // Apply date range filter
    const startDate = getStartDateFromRange(dateRange);
    if (startDate) {
      result = result.filter(t => new Date(t.date) >= startDate);
    }

    // Apply tag filter (AND logic - must have all selected tags)
    if (selectedTagIds.length > 0) {
      result = result.filter(training => 
        selectedTagIds.every(tagId => 
          training.tags?.some(tag => tag.id === tagId)
        )
      );
    }

    // Apply search filter
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter(training => 
        training.notes?.toLowerCase().includes(normalizedQuery) ||
        training.tags?.some(tag => tag.name.toLowerCase().includes(normalizedQuery))
      );
    }

    return result;
  }, [trainings, dateRange, selectedTagIds, searchQuery]);

  /** Total count of completed trainings (before filtering) */
  const totalCompletedCount = useMemo(
    () => trainings.filter(t => t.status === "completed").length,
    [trainings]
  );

  // ========================================
  // Event Handlers
  // ========================================

  /** Opens the edit sheet for a training */
  const handleEditOpen = useCallback((training: TrainingWithTags) => {
    setEditingState({
      training,
      notes: training.notes || "",
      tagIds: training.tags?.map(t => t.id) || [],
    });
  }, []);

  /** Closes the edit sheet */
  const handleEditClose = useCallback(() => {
    setEditingState(null);
  }, []);

  /** Saves changes from the edit sheet */
  const handleSaveEdit = useCallback(async () => {
    if (!editingState) return;

    const { training, notes, tagIds } = editingState;

    // Update notes if changed
    if (notes !== training.notes) {
      await updateTraining.mutateAsync({
        id: training.id,
        input: { notes }
      });
    }

    // Update tags
    await updateTags.mutateAsync({
      trainingSessionId: training.id,
      tagIds
    });

    setEditingState(null);
  }, [editingState, updateTraining, updateTags]);

  /** Removes a tag from the active filters */
  const handleRemoveTagFilter = useCallback((tagId: string) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  }, []);

  /** Clears all active tag filters */
  const handleClearAllFilters = useCallback(() => {
    setSelectedTagIds([]);
  }, []);

  /** Adds a tag to the active filters */
  const handleAddTagFilter = useCallback((tagId: string) => {
    if (tagId && !selectedTagIds.includes(tagId)) {
      setSelectedTagIds(prev => [...prev, tagId]);
    }
  }, [selectedTagIds]);

  // ========================================
  // Render: Loading State
  // ========================================

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground mt-4">Načítám historii tréninků...</p>
      </div>
    );
  }

  // ========================================
  // Render: Main Component
  // ========================================

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range selector */}
          <Select 
            value={dateRange} 
            onValueChange={(v) => setDateRange(v as DateRangeOption)}
          >
            <SelectTrigger className="w-40 bg-secondary">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tag filter selector */}
          <Select value="" onValueChange={handleAddTagFilter}>
            <SelectTrigger className="w-48 bg-secondary">
              <Tag className="w-4 h-4 mr-2" />
              <span>Filtrovat štítky</span>
            </SelectTrigger>
            <SelectContent>
              {allTags.map(tag => (
                <SelectItem 
                  key={tag.id} 
                  value={tag.id}
                  disabled={selectedTagIds.includes(tag.id)}
                >
                  <span 
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search input */}
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat v poznámkách..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary"
            />
          </div>
        </div>

        {/* Active tag filters display */}
        {selectedTagIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Aktivní filtry:</span>
            {selectedTagIds.map(tagId => {
              const tag = allTags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1 pr-1"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    borderColor: tag.color,
                    color: tag.color 
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTagFilter(tag.id)}
                    className="ml-1 p-0.5 rounded-full hover:bg-background/50"
                    aria-label={`Odebrat filtr ${tag.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="text-xs h-6"
            >
              Zrušit vše
            </Button>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Zobrazeno {filteredTrainings.length} z {totalCompletedCount} tréninků
      </p>

      {/* Training list */}
      <div className="space-y-3">
        {filteredTrainings.length > 0 ? (
          filteredTrainings.map((training) => (
            <TrainingHistoryItem
              key={training.id}
              training={training}
              onEdit={handleEditOpen}
            />
          ))
        ) : (
          <EmptyState hasFilters={selectedTagIds.length > 0 || !!searchQuery} />
        )}
      </div>

      {/* Edit sheet */}
      <Sheet open={!!editingState} onOpenChange={(open) => !open && handleEditClose()}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Upravit trénink</SheetTitle>
          </SheetHeader>
          
          {editingState && (
            <div className="space-y-6 mt-6">
              <div className="text-sm text-muted-foreground">
                {format(new Date(editingState.training.date), "d. MMMM yyyy HH:mm", { locale: cs })}
              </div>

              {/* Tags editor */}
              <div>
                <label className="text-sm font-medium mb-2 block">Štítky</label>
                <TrainingTagsSelector
                  selectedTagIds={editingState.tagIds}
                  onChange={(tagIds) => setEditingState(prev => 
                    prev ? { ...prev, tagIds } : null
                  )}
                />
              </div>

              {/* Notes editor */}
              <div>
                <label className="text-sm font-medium mb-2 block">Poznámky</label>
                <Textarea
                  value={editingState.notes}
                  onChange={(e) => setEditingState(prev => 
                    prev ? { ...prev, notes: e.target.value } : null
                  )}
                  placeholder="Poznámky k tréninku..."
                  className="min-h-[200px] bg-secondary"
                />
              </div>

              <Button 
                onClick={handleSaveEdit} 
                className="w-full"
                disabled={updateTags.isPending || updateTraining.isPending}
              >
                Uložit změny
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface TrainingHistoryItemProps {
  training: TrainingWithTags;
  onEdit: (training: TrainingWithTags) => void;
}

/** Individual training item in the history list */
function TrainingHistoryItem({ training, onEdit }: TrainingHistoryItemProps) {
  return (
    <div className="glass rounded-xl p-4 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Date, time, and duration */}
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-foreground">
              {format(new Date(training.date), "d. MMMM yyyy", { locale: cs })}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(training.date), "HH:mm")}
            </span>
            <span className="text-muted-foreground">
              {training.duration} min
            </span>
          </div>

          {/* Tags */}
          {training.tags && training.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {training.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    borderColor: tag.color,
                    color: tag.color 
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Notes preview */}
          {training.notes && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {training.notes}
            </p>
          )}
        </div>

        {/* Edit button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(training)}
          className="shrink-0"
          aria-label="Upravit trénink"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
}

/** Empty state when no trainings match filters */
function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground">
        Žádné tréninky nenalezeny
      </h3>
      <p className="text-muted-foreground mt-1">
        {hasFilters
          ? "Zkuste upravit filtry"
          : "Tento klient zatím nemá dokončené tréninky"}
      </p>
    </div>
  );
}
