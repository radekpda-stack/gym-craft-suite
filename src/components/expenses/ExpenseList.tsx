import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MoreVertical, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ExpenseForm } from './ExpenseForm';
import { getCategoryInfo, useDeleteExpense, type BusinessExpense } from '@/hooks/useBusinessExpenses';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(amount);
}

interface ExpenseListProps {
  expenses: BusinessExpense[];
  isLoading: boolean;
}

export function ExpenseList({ expenses, isLoading }: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<BusinessExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<BusinessExpense | null>(null);
  const deleteExpense = useDeleteExpense();

  const handleDelete = async () => {
    if (deletingExpense) {
      await deleteExpense.mutateAsync(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Zatím nemáte žádné náklady.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Přidejte první náklad kliknutím na tlačítko "Přidat náklad".
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group expenses by month
  const groupedByMonth: Record<string, BusinessExpense[]> = {};
  expenses.forEach((expense) => {
    const monthKey = expense.date.substring(0, 7);
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = [];
    }
    groupedByMonth[monthKey].push(expense);
  });

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedByMonth).map(([monthKey, monthExpenses]) => {
          const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          const monthLabel = format(new Date(monthKey + '-01'), 'LLLL yyyy', { locale: cs });

          return (
            <div key={monthKey} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-muted-foreground capitalize">
                  {monthLabel}
                </h3>
                <span className="text-sm font-semibold">
                  {formatCurrency(monthTotal)}
                </span>
              </div>

              <div className="space-y-2">
                {monthExpenses.map((expense) => {
                  const categoryInfo = getCategoryInfo(expense.category);
                  
                  return (
                    <Card key={expense.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="text-xl flex-shrink-0">
                              {categoryInfo.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {expense.name}
                                </span>
                                {expense.is_recurring && (
                                  <RefreshCw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{format(new Date(expense.date), 'd.M.yyyy')}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {categoryInfo.label}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-destructive whitespace-nowrap">
                              -{formatCurrency(Number(expense.amount))}
                            </span>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Upravit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDeletingExpense(expense)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Smazat
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {expense.description && (
                          <p className="text-xs text-muted-foreground mt-2 ml-10">
                            {expense.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Sheet */}
      <Sheet open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Upravit náklad</SheetTitle>
          </SheetHeader>
          {editingExpense && (
            <ExpenseForm 
              expense={editingExpense} 
              onSuccess={() => setEditingExpense(null)} 
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat náklad?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat náklad "{deletingExpense?.name}"? 
              Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
