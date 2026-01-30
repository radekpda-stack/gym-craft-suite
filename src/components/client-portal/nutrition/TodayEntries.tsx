import { useState, useMemo } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ClientReplyDialog } from './ClientReplyDialog';
import { useClientReply } from '@/hooks/useNutritionFeedback';
import { EnhancedFoodCard } from './EnhancedFoodCard';
import { EnhancedDrinkCard } from './EnhancedDrinkCard';
import { DaySummaryHeader } from './DaySummaryHeader';
import { ClientDayNutritionSummary } from './ClientDayNutritionSummary';

interface TodayEntriesProps {
  food: any[];
  drinks: any[];
  coffee: any[];
  isLoading?: boolean;
  selectedDate?: Date;
  dayNote?: string | null;
  isChecked?: boolean;
  onEditFood?: (entry: any) => void;
  onEditDrink?: (entry: any) => void;
  onEditCoffee?: (entry: any) => void;
  onDeleteFood?: (entryId: string) => void;
  onDeleteDrink?: (entryId: string) => void;
  onDeleteCoffee?: (entryId: string) => void;
  onReplyToDayNote?: (reply: string) => Promise<void>;
}

// Types for unified timeline
type TimelineEntry = {
  id: string;
  type: 'food' | 'drink' | 'coffee';
  time: string; // HH:mm format
  occurred_at: string | null;
  data: any;
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
  dayNote,
  isChecked,
  onEditFood,
  onEditDrink,
  onEditCoffee,
  onDeleteFood,
  onDeleteDrink,
  onDeleteCoffee,
  onReplyToDayNote,
}: TodayEntriesProps) {
  const displayDate = selectedDate || new Date();
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'food' | 'drink' | 'coffee'; id: string } | null>(null);
  
  const hasEntries = food.length > 0 || drinks.length > 0 || coffee.length > 0;

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

  const handleFoodReply = async (entryId: string) => {
    const entry = food.find(f => f.id === entryId);
    if (entry?.trainer_comment) {
      setReplyDialog({
        open: true,
        type: 'food',
        entryId,
        trainerComment: entry.trainer_comment,
        currentReply: entry.client_reply,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!hasEntries) {
    return (
      <div className="space-y-4">
        <DaySummaryHeader
          date={displayDate}
          mealCount={0}
          waterMl={0}
          coffeeCount={0}
          isChecked={isChecked}
          trainerDayNote={dayNote}
          onReply={onReplyToDayNote}
        />
        <div className="rounded-2xl border border-dashed border-border/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Zatím žádné záznamy pro tento den
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Day Summary Header */}
        <DaySummaryHeader
          date={displayDate}
          mealCount={food.length}
          waterMl={totalWaterMl}
          coffeeCount={totalCoffee}
          isChecked={isChecked}
          trainerDayNote={dayNote}
          onReply={onReplyToDayNote}
        />

        {/* Nutrition Summary - AI-enriched calories and macros */}
        {food.length > 0 && (
          <ClientDayNutritionSummary foodEntries={food} />
        )}

        {/* Timeline - Enhanced Cards */}
        <div className="space-y-3">
          {timeline.map((item) => {
            if (item.type === 'food') {
              const entry = item.data;
              return (
                <EnhancedFoodCard
                  key={entry.id}
                  entry={entry}
                  time={item.time}
                  onEdit={onEditFood ? () => onEditFood(entry) : undefined}
                  onDelete={onDeleteFood ? () => setDeleteDialog({ type: 'food', id: entry.id }) : undefined}
                  onReply={entry.trainer_comment && !entry.client_reply 
                    ? async (reply) => {
                        await clientReply.mutateAsync({
                          type: 'food',
                          entryId: entry.id,
                          reply,
                        });
                      }
                    : undefined
                  }
                />
              );
            }
            
            if (item.type === 'drink') {
              const entry = item.data;
              return (
                <EnhancedDrinkCard
                  key={entry.id}
                  entry={entry}
                  type="drink"
                  time={item.time}
                  onEdit={onEditDrink ? () => onEditDrink(entry) : undefined}
                  onDelete={onDeleteDrink ? () => setDeleteDialog({ type: 'drink', id: entry.id }) : undefined}
                />
              );
            }
            
            if (item.type === 'coffee') {
              const entry = item.data;
              return (
                <EnhancedDrinkCard
                  key={entry.id}
                  entry={entry}
                  type="coffee"
                  time={item.time}
                  onEdit={onEditCoffee ? () => onEditCoffee(entry) : undefined}
                  onDelete={onDeleteCoffee ? () => setDeleteDialog({ type: 'coffee', id: entry.id }) : undefined}
                />
              );
            }
            
            return null;
          })}
        </div>
      </div>

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
