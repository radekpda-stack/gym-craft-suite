/**
 * ClientDetailView Component
 * 
 * Displays client information in view mode (read-only) or edit mode.
 * Handles inline editing of client data without page navigation.
 */
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Edit2,
  Save,
  X,
  Phone,
  Mail,
  Target,
  AlertTriangle,
  CreditCard,
  Cake,
  Plus,
  Loader2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { ClientTagsManager } from '@/components/clients/ClientTagsManager';
import { ClientBudgetGroupCard } from '@/components/clients/ClientBudgetGroupCard';
import { FeedbackHistoryList } from '@/components/feedback/FeedbackHistoryList';
import { Client } from '@/hooks/useClients';
import { useToggleFavorite } from '@/hooks/useFavoriteClients';
import { clientFormSchema, ClientFormValues } from '@/lib/validations/client';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-time-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface ClientDetailViewProps {
  client: Client;
  onSave: (data: ClientFormValues) => Promise<void>;
  isLoading?: boolean;
}

/** Suggested training goals for quick selection */
const SUGGESTED_GOALS = [
  'Hubnutí',
  'Nabírání svalů',
  'Síla',
  'Kondice',
  'Flexibilita',
  'Rehabilitace',
  'Obecná fitness',
];

/**
 * Returns appropriate color class based on credit balance
 */
function getCreditColor(credit: number): string {
  if (credit < 0) return 'text-destructive';
  if (credit < 500) return 'text-warning';
  return 'text-success';
}

export function ClientDetailView({ client, onSave, isLoading }: ClientDetailViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const toggleFavorite = useToggleFavorite();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      trainingGoals: client.training_goals || [],
      notes: client.notes || '',
      healthRestrictions: client.health_restrictions || '',
      creditBalance: client.credit_balance || 0,
      birthDate: client.birth_date || '',
    },
  });

  // Reset form when client data changes or when exiting edit mode
  useEffect(() => {
    form.reset({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      trainingGoals: client.training_goals || [],
      notes: client.notes || '',
      healthRestrictions: client.health_restrictions || '',
      creditBalance: client.credit_balance || 0,
      birthDate: client.birth_date || '',
    });
  }, [client, form]);

  const trainingGoals = form.watch('trainingGoals');

  /** Add a training goal to the list */
  const addGoal = (goal: string) => {
    const trimmedGoal = goal.trim();
    if (trimmedGoal && !trainingGoals.includes(trimmedGoal)) {
      form.setValue('trainingGoals', [...trainingGoals, trimmedGoal]);
    }
    setNewGoal('');
  };

  /** Remove a training goal from the list */
  const removeGoal = (goalToRemove: string) => {
    form.setValue(
      'trainingGoals',
      trainingGoals.filter((goal) => goal !== goalToRemove)
    );
  };

  /** Handle form submission */
  const handleSubmit = async (data: ClientFormValues) => {
    await onSave(data);
    setIsEditMode(false);
  };

  /** Cancel editing and reset form */
  const handleCancel = () => {
    form.reset();
    setIsEditMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with avatar, name, and edit controls */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <ClientAvatar name={client.name} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      {...field}
                      className="text-2xl font-bold h-10 bg-secondary border-border"
                      placeholder="Jméno klienta"
                    />
                  )}
                />
              ) : (
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {client.name}
                </h1>
              )}
              <button
                onClick={() => toggleFavorite.mutate({ clientId: client.id, isFavorite: !client.is_favorite })}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  client.is_favorite
                    ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'
                    : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10'
                )}
                aria-label={client.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
              >
                <Star className={cn('w-5 h-5', client.is_favorite && 'fill-current')} />
              </button>
            </div>
            <p className="text-muted-foreground mt-1">
              Klient od {format(new Date(client.created_at), 'MMMM yyyy', { locale: cs })}
            </p>
            <div className="mt-2">
              <ClientTagsManager clientId={client.id} />
            </div>
          </div>
        </div>

        {/* Edit/Save/Cancel buttons */}
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Zrušit
              </Button>
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Uložit
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsEditMode(true)}
            >
              <Edit2 className="w-4 h-4" />
              Upravit
            </Button>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Email */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Mail className="w-4 h-4" />
              <span className="text-sm">Email</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="jan@example.com"
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="font-medium text-foreground">{client.email || '—'}</p>
            )}
          </div>

          {/* Phone */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Phone className="w-4 h-4" />
              <span className="text-sm">Telefon</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+420 123 456 789"
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="font-medium text-foreground">{client.phone || '—'}</p>
            )}
          </div>

          {/* Credit */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">Kredit</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="creditBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="bg-secondary border-border"
                        value={field.value === 0 ? '' : field.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? 0 : parseFloat(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className={cn('font-bold text-lg', getCreditColor(client.credit_balance || 0))}>
                {(client.credit_balance || 0).toLocaleString('cs-CZ')} Kč
              </p>
            )}
          </div>

          {/* Birth Date */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <Cake className="w-4 h-4" />
              <span className="text-sm">Datum narození</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DatePicker
                        value={field.value || ''}
                        onChange={(dateStr) => field.onChange(dateStr)}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="font-medium text-foreground">
                {client.birth_date
                  ? format(new Date(client.birth_date), 'd. MMMM yyyy', { locale: cs })
                  : '—'}
              </p>
            )}
          </div>
        </div>

        {/* Shared Budget Group */}
        <ClientBudgetGroupCard clientId={client.id} clientName={client.name} />

        {/* Goals & Restrictions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Training Goals */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-3">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Tréninkové cíle</span>
            </div>
            {isEditMode ? (
              <div className="space-y-3">
                {/* Suggested goals */}
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_GOALS.filter((g) => !trainingGoals.includes(g)).map((goal) => (
                    <Badge
                      key={goal}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => addGoal(goal)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {goal}
                    </Badge>
                  ))}
                </div>
                {/* Custom goal input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Vlastní cíl..."
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addGoal(newGoal);
                      }
                    }}
                    className="bg-secondary border-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addGoal(newGoal)}
                    disabled={!newGoal.trim()}
                  >
                    Přidat
                  </Button>
                </div>
                {/* Selected goals */}
                {trainingGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {trainingGoals.map((goal) => (
                      <Badge key={goal} className="bg-primary/20 text-primary hover:bg-primary/30">
                        {goal}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeGoal(goal)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(client.training_goals || []).length > 0 ? (
                  client.training_goals.map((goal) => (
                    <span
                      key={goal}
                      className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-medium"
                    >
                      {goal}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">Žádné cíle</span>
                )}
              </div>
            )}
          </div>

          {/* Health Restrictions */}
          <div className={cn(
            'glass rounded-2xl p-5',
            (client.health_restrictions || isEditMode) && 'border-l-4 border-l-warning'
          )}>
            <div className="flex items-center gap-3 text-warning mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Zdravotní omezení</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="healthRestrictions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Např. bolesti zad, zranění kolene..."
                        className="bg-secondary border-border min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="text-foreground">
                {client.health_restrictions || <span className="text-muted-foreground">Žádná omezení</span>}
              </p>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Poznámky</h3>
          {isEditMode ? (
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Další poznámky ke klientovi..."
                      className="bg-secondary border-border min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {client.notes || <span className="italic">Žádné poznámky</span>}
            </p>
          )}
        </div>

        {/* Feedback History Section */}
        <FeedbackHistoryList clientId={client.id} />
      </Form>
    </div>
  );
}
