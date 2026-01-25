import { useState, useMemo } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Utensils, Droplets, Coffee, MoreVertical, Pencil, Trash2, MessageSquare, Ban, Star, Reply } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ClientReplyDialog } from './ClientReplyDialog';
import { useClientReply } from '@/hooks/useNutritionFeedback';

interface TodayEntriesProps {
  food: any[];
  drinks: any[];
  coffee: any[];
  isLoading?: boolean;
  selectedDate?: Date;
  onEditFood?: (entry: any) => void;
  onEditDrink?: (entry: any) => void;
  onEditCoffee?: (entry: any) => void;
  onDeleteFood?: (entryId: string) => void;
  onDeleteDrink?: (entryId: string) => void;
  onDeleteCoffee?: (entryId: string) => void;
}

import {
  MEAL_LABELS,
  DRINK_LABELS,
  COFFEE_LABELS,
  QUALITY_LABELS,
  SATIATION_LABELS,
} from './constants';

// Types for unified timeline
type TimelineEntry = {
  id: string;
  type: 'food' | 'drink' | 'coffee';
  time: string; // HH:mm format
  occurred_at: string | null;
  data: any;
};

// Helper functions for quality and satiation display
const getQualityIcon = (quality: string | null | undefined) => {
  if (!quality) return null;
  switch (quality) {
    case 'good': return '💚';
    case 'poor': return '🔴';
    case 'neutral': return '🟡';
    default: return null;
  }
};

const getSatiationLabel = (satiation: string | null | undefined) => {
  if (!satiation) return null;
  switch (satiation) {
    case 'just_right': return 'Akorát';
    case 'still_hungry': return 'Hlad';
    case 'overeaten': return 'Přejedení';
    default: return null;
  }
};

// Rating color helper
const getRatingColor = (rating: number): string => {
  if (rating <= 3) return 'text-destructive';
  if (rating <= 6) return 'text-warning';
  if (rating <= 8) return 'text-success';
  return 'text-emerald-500';
};

const getRatingLabel = (rating: number): string => {
  if (rating <= 3) return 'Potřebuje zlepšit';
  if (rating <= 6) return 'Průměrné';
  if (rating <= 8) return 'Dobré';
  return 'Výborné!';
};

// Get time from entry (prefer occurred_at, fallback to entry_time, then created_at)
const getEntryTime = (entry: any): string => {
  if (entry.occurred_at) {
    try {
      return format(parseISO(entry.occurred_at), 'HH:mm');
    } catch {
      // fallback
    }
  }
  if (entry.entry_time) {
    return entry.entry_time.slice(0, 5);
  }
  if (entry.created_at) {
    try {
      return format(parseISO(entry.created_at), 'HH:mm');
    } catch {
      return '--:--';
    }
  }
  return '--:--';
};

export function TodayEntries({ 
  food, 
  drinks, 
  coffee, 
  isLoading,
  selectedDate,
  onEditFood,
  onEditDrink,
  onEditCoffee,
  onDeleteFood,
  onDeleteDrink,
  onDeleteCoffee,
}: TodayEntriesProps) {
  const displayDate = selectedDate || new Date();
  const isSelectedToday = isToday(displayDate);
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'food' | 'drink' | 'coffee'; id: string } | null>(null);
  
  const hasEntries = food.length > 0 || drinks.length > 0 || coffee.length > 0;
  const canEdit = onEditFood || onEditDrink || onEditCoffee;
  const canDelete = onDeleteFood || onDeleteDrink || onDeleteCoffee;

  const clientReply = useClientReply();
  const [replyDialog, setReplyDialog] = useState<{
    open: boolean;
    type: 'food' | 'drink' | 'coffee';
    entryId: string;
    trainerComment: string;
    currentReply: string | null;
  } | null>(null);

  // Calculate stats for header
  const totalWaterMl = drinks
    .filter(d => d.drink_type === 'water')
    .reduce((sum, d) => sum + (d.amount_ml || 0), 0);
  const totalCoffee = coffee.reduce((sum, c) => sum + (c.count || 1), 0);

  // Create unified timeline sorted by time
  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    
    food.forEach(entry => {
      entries.push({
        id: entry.id,
        type: 'food',
        time: getEntryTime(entry),
        occurred_at: entry.occurred_at,
        data: entry,
      });
    });
    
    drinks.forEach(entry => {
      entries.push({
        id: entry.id,
        type: 'drink',
        time: getEntryTime(entry),
        occurred_at: entry.occurred_at,
        data: entry,
      });
    });
    
    coffee.forEach(entry => {
      entries.push({
        id: entry.id,
        type: 'coffee',
        time: getEntryTime(entry),
        occurred_at: entry.occurred_at,
        data: entry,
      });
    });
    
    // Sort by time
    return entries.sort((a, b) => a.time.localeCompare(b.time));
  }, [food, drinks, coffee]);

  const handleConfirmDelete = () => {
    if (!deleteDialog) return;
    
    if (deleteDialog.type === 'food' && onDeleteFood) {
      onDeleteFood(deleteDialog.id);
    } else if (deleteDialog.type === 'drink' && onDeleteDrink) {
      onDeleteDrink(deleteDialog.id);
    } else if (deleteDialog.type === 'coffee' && onDeleteCoffee) {
      onDeleteCoffee(deleteDialog.id);
    }
    
    setDeleteDialog(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {isSelectedToday ? 'Dnešní záznamy' : `Záznamy ${format(displayDate, 'd. MMMM', { locale: cs })}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasEntries) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isSelectedToday 
              ? 'Zatím žádné záznamy pro dnešek' 
              : `Žádné záznamy pro ${format(displayDate, 'd. MMMM', { locale: cs })}`
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{isSelectedToday ? 'Dnešní záznamy' : 'Záznamy'}</span>
              {/* Inline stats */}
              <span className="text-xs font-normal text-muted-foreground">
                ({food.length} jídel{totalWaterMl > 0 && `, ${totalWaterMl}ml`}{totalCoffee > 0 && `, ${totalCoffee}☕`})
              </span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              {format(displayDate, 'd. MMMM', { locale: cs })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
        {/* Unified Timeline */}
          {timeline.map((item) => {
            if (item.type === 'food') {
              const entry = item.data;
              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4 text-warning" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {MEAL_LABELS[entry.meal_type] || entry.meal_type}
                        </span>
                      </div>
                      <p className="text-sm">{entry.description}</p>
                      
                      {/* Portion + Quality + Satiation on one line */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.portion_size && (
                          <span className="text-xs text-muted-foreground">
                            {entry.portion_size === 'small' ? 'Malá' : entry.portion_size === 'large' ? 'Velká' : 'Střední'} porce
                          </span>
                        )}
                        {entry.quality && (
                          <span className="text-xs">
                            {getQualityIcon(entry.quality)}
                          </span>
                        )}
                        {entry.satiation && (
                          <span className="text-xs text-muted-foreground">
                            {getSatiationLabel(entry.satiation)}
                          </span>
                        )}
                      </div>
                      
                      {/* Note if present */}
                      {entry.note && (
                        <p className="text-xs text-muted-foreground italic mt-1">📝 {entry.note}</p>
                      )}
                    </div>
                    {(canEdit || canDelete) && (
                      <EntryMenu
                        onEdit={onEditFood ? () => onEditFood(entry) : undefined}
                        onDelete={() => setDeleteDialog({ type: 'food', id: entry.id })}
                      />
                    )}
                  </div>
                  {/* Trainer Rating & Comment */}
                  {(entry.trainer_rating || entry.trainer_comment) && (
                    <div className="flex flex-col gap-1 ml-11 p-2 rounded-md bg-primary/5 border border-primary/10">
                      {entry.trainer_rating && (
                        <div className={cn("flex items-center gap-1 text-sm font-medium", getRatingColor(entry.trainer_rating))}>
                          <Star className="w-4 h-4 fill-current" />
                          <span>{entry.trainer_rating}/10 - {getRatingLabel(entry.trainer_rating)}</span>
                        </div>
                      )}
                      {entry.trainer_comment && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-primary">{entry.trainer_comment}</p>
                        </div>
                      )}
                      {entry.client_reply && (
                        <div className="mt-1 pl-5 text-xs text-muted-foreground">
                          <span className="font-medium">Vaše odpověď:</span> {entry.client_reply}
                        </div>
                      )}
                      {entry.trainer_comment && !entry.client_reply && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="self-start h-6 text-xs mt-1"
                          onClick={() => setReplyDialog({
                            open: true,
                            type: 'food',
                            entryId: entry.id,
                            trainerComment: entry.trainer_comment,
                            currentReply: entry.client_reply,
                          })}
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          Odpovědět
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            
            if (item.type === 'drink') {
              const entry = item.data;
              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Droplets className="w-4 h-4 text-accent" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {entry.drink_name || DRINK_LABELS[entry.drink_type] || entry.drink_type}
                        </span>
                        {entry.amount_ml && (
                          <span className="text-xs text-muted-foreground">
                            {entry.amount_ml}ml
                          </span>
                        )}
                      </div>
                      {entry.drink_name && entry.drink_type === 'other' && (
                        <span className="text-xs text-muted-foreground">(Jiné)</span>
                      )}
                    </div>
                    {(canEdit || canDelete) && (
                      <EntryMenu
                        onEdit={onEditDrink ? () => onEditDrink(entry) : undefined}
                        onDelete={() => setDeleteDialog({ type: 'drink', id: entry.id })}
                      />
                    )}
                  </div>
                  {/* Trainer Comment */}
                  {entry.trainer_comment && (
                    <div className="flex items-start gap-2 ml-11 p-2 rounded-md bg-primary/5 border border-primary/10">
                      <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-primary">{entry.trainer_comment}</p>
                    </div>
                  )}
                </div>
              );
            }
            
            if (item.type === 'coffee') {
              const entry = item.data;
              const isCaffeinated = entry.is_caffeinated !== false;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-lg border",
                    isCaffeinated 
                      ? "bg-amber-500/5 border-amber-500/10" 
                      : "bg-muted/30 border-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative",
                        isCaffeinated ? "bg-amber-500/10" : "bg-muted"
                      )}>
                        <Coffee className={cn(
                          "w-4 h-4",
                          isCaffeinated ? "text-amber-600" : "text-muted-foreground"
                        )} />
                        {!isCaffeinated && (
                          <Ban className="w-3 h-3 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {COFFEE_LABELS[entry.coffee_type] || entry.coffee_type}
                        </span>
                        {entry.count > 1 && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            ×{entry.count}
                          </span>
                        )}
                        {!isCaffeinated && (
                          <span className="text-xs text-muted-foreground">(bez kofeinu)</span>
                        )}
                        {entry.coffee_amount_ml && (
                          <span className="text-xs text-muted-foreground">
                            {entry.coffee_amount_ml}ml
                          </span>
                        )}
                      </div>
                    </div>
                    {(canEdit || canDelete) && (
                      <EntryMenu
                        onEdit={onEditCoffee ? () => onEditCoffee(entry) : undefined}
                        onDelete={() => setDeleteDialog({ type: 'coffee', id: entry.id })}
                      />
                    )}
                  </div>
                  {/* Trainer Comment */}
                  {entry.trainer_comment && (
                    <div className="flex items-start gap-2 ml-11 p-2 rounded-md bg-primary/5 border border-primary/10">
                      <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-primary">{entry.trainer_comment}</p>
                    </div>
                  )}
                </div>
              );
            }
            
            return null;
          })}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Záznam bude trvale smazán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Client Reply Dialog */}
      {replyDialog && (
        <ClientReplyDialog
          open={replyDialog.open}
          onOpenChange={(open) => !open && setReplyDialog(null)}
          trainerComment={replyDialog.trainerComment}
          currentReply={replyDialog.currentReply}
          onSave={async (reply) => {
            await clientReply.mutateAsync({
              type: replyDialog.type,
              entryId: replyDialog.entryId,
              reply,
            });
            setReplyDialog(null);
          }}
          isLoading={clientReply.isPending}
        />
      )}
    </>
  );
}

function EntryMenu({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Upravit
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Smazat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
