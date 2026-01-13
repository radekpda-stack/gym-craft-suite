import { useState } from 'react';
import { format, isToday } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Utensils, Droplets, Coffee, MoreVertical, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from './constants';

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
            <span>{isSelectedToday ? 'Dnešní záznamy' : 'Záznamy'}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {format(displayDate, 'd. MMMM', { locale: cs })}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Food entries */}
          {food.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Utensils className="w-4 h-4 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {MEAL_LABELS[entry.meal_type] || entry.meal_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.entry_time?.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-sm truncate">{entry.description}</p>
                  {entry.portion_size && (
                    <span className="text-xs text-muted-foreground">
                      {entry.portion_size === 'small' ? 'Malá' : entry.portion_size === 'large' ? 'Velká' : 'Střední'} porce
                    </span>
                  )}
                </div>
                {(canEdit || canDelete) && (
                  <EntryMenu
                    onEdit={onEditFood ? () => onEditFood(entry) : undefined}
                    onDelete={() => setDeleteDialog({ type: 'food', id: entry.id })}
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
          ))}

          {/* Drink entries */}
          {drinks.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Droplets className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {DRINK_LABELS[entry.drink_type] || entry.drink_type}
                    </span>
                    {entry.amount_ml && (
                      <span className="text-xs text-muted-foreground">
                        {entry.amount_ml} ml
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {entry.entry_time?.slice(0, 5)}
                </span>
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
          ))}

          {/* Coffee entries */}
          {coffee.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4 text-warning" />
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
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {entry.entry_time?.slice(0, 5)}
                </span>
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
          ))}
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
