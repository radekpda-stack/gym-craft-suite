import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCreateExpense, useUpdateExpense, EXPENSE_CATEGORIES, type BusinessExpense, type CreateExpenseData } from '@/hooks/useBusinessExpenses';

const formSchema = z.object({
  name: z.string().min(1, 'Název je povinný'),
  amount: z.number().min(1, 'Částka musí být větší než 0'),
  date: z.date(),
  category: z.enum(['rent', 'equipment', 'education', 'marketing', 'software', 'transport', 'insurance', 'other']),
  description: z.string().optional(),
  notes: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_interval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: BusinessExpense;
  onSuccess?: () => void;
}

export function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEditing = !!expense;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: expense?.name || '',
      amount: expense?.amount || 0,
      date: expense?.date ? new Date(expense.date) : new Date(),
      category: expense?.category || 'other',
      description: expense?.description || '',
      notes: expense?.notes || '',
      is_recurring: expense?.is_recurring || false,
      recurring_interval: expense?.recurring_interval || undefined,
    },
  });

  const isRecurring = form.watch('is_recurring');

  const onSubmit = async (data: FormData) => {
    const expenseData: CreateExpenseData = {
      name: data.name,
      amount: data.amount,
      date: format(data.date, 'yyyy-MM-dd'),
      category: data.category,
      description: data.description || undefined,
      notes: data.notes || undefined,
      is_recurring: data.is_recurring,
      recurring_interval: data.is_recurring ? data.recurring_interval : undefined,
    };

    try {
      if (isEditing) {
        await updateExpense.mutateAsync({ id: expense.id, ...expenseData });
      } else {
        await createExpense.mutateAsync(expenseData);
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isSubmitting = createExpense.isPending || updateExpense.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Název nákladu *</FormLabel>
              <FormControl>
                <Input placeholder="např. Nájem posilovny" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Částka (Kč) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Datum *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'd.M.yyyy') : 'Vyberte datum'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategorie *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte kategorii" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Popis</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Volitelný popis nákladu..." 
                  className="resize-none"
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">Opakující se náklad</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Náklad se bude automaticky opakovat
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isRecurring && (
          <FormField
            control={form.control}
            name="recurring_interval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interval opakování</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte interval" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Měsíčně</SelectItem>
                    <SelectItem value="quarterly">Čtvrtletně</SelectItem>
                    <SelectItem value="yearly">Ročně</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poznámky</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Interní poznámky..." 
                  className="resize-none"
                  rows={2}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Ukládám...' : isEditing ? 'Uložit změny' : 'Přidat náklad'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
