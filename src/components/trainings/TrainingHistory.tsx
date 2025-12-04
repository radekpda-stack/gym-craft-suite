import { useState, useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { cs } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  Tag, 
  Filter, 
  X, 
  Edit2, 
  ChevronDown,
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
import { useClientTrainingHistory, useUpdateTrainingSessionTags } from "@/hooks/useTrainingSessionTags";
import { useTags, Tag as TagType } from "@/hooks/useTags";
import { useUpdateTrainingSession } from "@/hooks/useTrainingSessions";
import { TrainingTagsSelector } from "./TrainingTagsSelector";
import { cn } from "@/lib/utils";

interface TrainingHistoryProps {
  clientId: string;
}

type DateRangeOption = "all" | "1m" | "3m" | "6m" | "1y";

export function TrainingHistory({ clientId }: TrainingHistoryProps) {
  const { data: trainings = [], isLoading } = useClientTrainingHistory(clientId);
  const { data: allTags = [] } = useTags();
  const updateTags = useUpdateTrainingSessionTags();
  const updateTraining = useUpdateTrainingSession();
  
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRangeOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    let result = trainings;

    // Filter by status (only completed)
    result = result.filter(t => t.status === "completed");

    // Filter by date range
    if (dateRange !== "all") {
      const now = new Date();
      let start: Date;
      switch (dateRange) {
        case "1m":
          start = subMonths(now, 1);
          break;
        case "3m":
          start = subMonths(now, 3);
          break;
        case "6m":
          start = subMonths(now, 6);
          break;
        case "1y":
          start = subMonths(now, 12);
          break;
        default:
          start = new Date(0);
      }
      result = result.filter(t => new Date(t.date) >= start);
    }

    // Filter by tags
    if (selectedTagIds.length > 0) {
      result = result.filter(t => 
        selectedTagIds.every(tagId => 
          t.tags?.some((tag: TagType) => tag.id === tagId)
        )
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.notes?.toLowerCase().includes(query) ||
        t.tags?.some((tag: TagType) => tag.name.toLowerCase().includes(query))
      );
    }

    return result;
  }, [trainings, dateRange, selectedTagIds, searchQuery]);

  const handleEditOpen = (training: any) => {
    setEditingTraining(training);
    setEditNotes(training.notes || "");
    setEditTagIds(training.tags?.map((t: TagType) => t.id) || []);
  };

  const handleSaveEdit = async () => {
    if (!editingTraining) return;

    // Update notes if changed
    if (editNotes !== editingTraining.notes) {
      await updateTraining.mutateAsync({
        id: editingTraining.id,
        input: { notes: editNotes }
      });
    }

    // Update tags
    await updateTags.mutateAsync({
      trainingSessionId: editingTraining.id,
      tagIds: editTagIds
    });

    setEditingTraining(null);
  };

  const removeTagFilter = (tagId: string) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground mt-4">Načítám historii tréninků...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
            <SelectTrigger className="w-40 bg-secondary">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vše</SelectItem>
              <SelectItem value="1m">Poslední měsíc</SelectItem>
              <SelectItem value="3m">Poslední 3 měsíce</SelectItem>
              <SelectItem value="6m">Poslední 6 měsíců</SelectItem>
              <SelectItem value="1y">Poslední rok</SelectItem>
            </SelectContent>
          </Select>

          {/* Tag filter */}
          <Select 
            value="" 
            onValueChange={(tagId) => {
              if (tagId && !selectedTagIds.includes(tagId)) {
                setSelectedTagIds(prev => [...prev, tagId]);
              }
            }}
          >
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

          {/* Search */}
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

        {/* Active tag filters */}
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
                    onClick={() => removeTagFilter(tag.id)}
                    className="ml-1 p-0.5 rounded-full hover:bg-background/50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTagIds([])}
              className="text-xs h-6"
            >
              Zrušit vše
            </Button>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Zobrazeno {filteredTrainings.length} z {trainings.filter(t => t.status === "completed").length} tréninků
      </p>

      {/* Training list */}
      <div className="space-y-3">
        {filteredTrainings.length > 0 ? (
          filteredTrainings.map((training) => (
            <div
              key={training.id}
              className="glass rounded-xl p-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Date and time */}
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
                      {training.tags.map((tag: TagType) => (
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

                  {/* Notes */}
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
                  onClick={() => handleEditOpen(training)}
                  className="shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="glass rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              Žádné tréninky nenalezeny
            </h3>
            <p className="text-muted-foreground mt-1">
              {selectedTagIds.length > 0 || searchQuery
                ? "Zkuste upravit filtry"
                : "Tento klient zatím nemá dokončené tréninky"}
            </p>
          </div>
        )}
      </div>

      {/* Edit sheet */}
      <Sheet open={!!editingTraining} onOpenChange={(open) => !open && setEditingTraining(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Upravit trénink</SheetTitle>
          </SheetHeader>
          
          {editingTraining && (
            <div className="space-y-6 mt-6">
              <div className="text-sm text-muted-foreground">
                {format(new Date(editingTraining.date), "d. MMMM yyyy HH:mm", { locale: cs })}
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium mb-2 block">Štítky</label>
                <TrainingTagsSelector
                  selectedTagIds={editTagIds}
                  onChange={setEditTagIds}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Poznámky</label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
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
