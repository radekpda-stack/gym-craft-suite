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
  CalendarDays,
  User,
  Hand,
  Briefcase,
  Activity,
  Moon,
  Heart,
  Dumbbell,
  History,
  Pill,
  Apple,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { ClientTagsManager } from '@/components/clients/ClientTagsManager';
import { ClientBudgetGroupCard } from '@/components/clients/ClientBudgetGroupCard';
import { FeedbackHistoryList } from '@/components/feedback/FeedbackHistoryList';
import { ClientPreDiagnosticSection } from '@/components/clients/ClientPreDiagnosticSection';
import { Client } from '@/hooks/useClients';
import { useToggleFavorite } from '@/hooks/useFavoriteClients';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
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

/** Labels for current activities */
const ACTIVITY_LABELS: Record<string, string> = {
  running: 'Běh',
  cycling: 'Cyklistika',
  swimming: 'Plavání',
  yoga: 'Jóga',
  hiking: 'Turistika',
  team_sports: 'Kolektivní sporty',
  martial_arts: 'Bojové sporty',
  dancing: 'Tanec',
  gym: 'Posilovna',
  other: 'Jiné',
};

/** Labels for supplements */
const SUPPLEMENT_LABELS: Record<string, string> = {
  protein: 'Protein',
  creatine: 'Kreatin',
  vitamins: 'Vitamíny',
  omega3: 'Omega-3',
  magnesium: 'Hořčík',
  collagen: 'Kolagen',
  bcaa: 'BCAA',
  caffeine: 'Kofein',
};

/** Labels for dietary restrictions */
const DIETARY_RESTRICTION_LABELS: Record<string, string> = {
  vegetarian: 'Vegetarián',
  vegan: 'Vegan',
  gluten_free: 'Bezlepková dieta',
  lactose_free: 'Bez laktózy',
  low_carb: 'Nízkosacharidová',
  keto: 'Keto',
  allergies: 'Alergie',
};

function getActivityLabel(value: string): string {
  return ACTIVITY_LABELS[value] || value;
}

function getSupplementLabel(value: string): string {
  return SUPPLEMENT_LABELS[value] || value;
}

function getDietaryRestrictionLabel(value: string): string {
  return DIETARY_RESTRICTION_LABELS[value] || value;
}

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
  const { data: sharedBudgetInfo } = useSharedBudgetBalance(client.id);
  
  // Check if client is in a shared budget
  const isInSharedBudget = sharedBudgetInfo?.isShared ?? false;

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
      gender: (client.gender as 'male' | 'female' | undefined) || undefined,
      createdAt: client.created_at ? client.created_at.split('T')[0] : '',
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
      gender: (client.gender as 'male' | 'female' | undefined) || undefined,
      createdAt: client.created_at ? client.created_at.split('T')[0] : '',
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header with avatar, name, and edit controls */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <ClientAvatar name={client.name} size="lg" className="sm:w-16 sm:h-16" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      {...field}
                      className="text-xl sm:text-2xl font-bold h-10 bg-secondary border-border"
                      placeholder="Jméno klienta"
                    />
                  )}
                />
              ) : (
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
                  {client.name}
                </h1>
              )}
              <button
                onClick={() => toggleFavorite.mutate({ clientId: client.id, isFavorite: !client.is_favorite })}
                className={cn(
                  'p-1.5 rounded-lg transition-all flex-shrink-0',
                  client.is_favorite
                    ? 'text-warning bg-warning/10 hover:bg-warning/20'
                    : 'text-muted-foreground hover:text-warning hover:bg-warning/10'
                )}
                aria-label={client.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
              >
                <Star className={cn('w-5 h-5', client.is_favorite && 'fill-current')} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Klient od {format(new Date(client.created_at), 'MMMM yyyy', { locale: cs })}
            </p>
            <div className="mt-2">
              <ClientTagsManager clientId={client.id} />
            </div>
          </div>
        </div>

        {/* Edit/Save/Cancel buttons */}
        <div className="flex gap-2 sm:flex-shrink-0">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="gap-2 flex-1 sm:flex-initial h-11 sm:h-10"
              >
                <X className="w-4 h-4" />
                <span>Zrušit</span>
              </Button>
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isLoading}
                className="gap-2 flex-1 sm:flex-initial h-11 sm:h-10"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Uložit</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="gap-2 h-11 sm:h-10 w-full sm:w-auto"
              onClick={() => setIsEditMode(true)}
            >
              <Edit2 className="w-4 h-4" />
              <span>Upravit</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <Form {...form}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Email */}
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
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
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
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

          {/* Credit - only show if NOT in shared budget (shared budget shows in ClientBudgetGroupCard) */}
          {!isInSharedBudget && (
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
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
          )}

          {/* Birth Date */}
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
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

          {/* Gender */}
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <User className="w-4 h-4" />
              <span className="text-sm">Pohlaví</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        className="flex gap-4 h-10 items-center"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="client-detail-gender-male" />
                          <Label htmlFor="client-detail-gender-male" className="cursor-pointer">
                            Muž
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="client-detail-gender-female" />
                          <Label htmlFor="client-detail-gender-female" className="cursor-pointer">
                            Žena
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="font-medium text-foreground">
                {client.gender === 'male' ? 'Muž' : client.gender === 'female' ? 'Žena' : '—'}
              </p>
            )}
          </div>

          {/* Created At / Client Since */}
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm">Klientem od</span>
            </div>
            {isEditMode ? (
              <FormField
                control={form.control}
                name="createdAt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="date"
                        className="bg-secondary border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <p className="font-medium text-foreground">
                {client.created_at
                  ? format(new Date(client.created_at), 'd. MMMM yyyy', { locale: cs })
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

        {/* Extended Client Info - Lifestyle & Activities Section */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Životní styl a aktivity
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Handedness */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Hand className="w-4 h-4" />
                Dominantní ruka
              </div>
              <p className="font-medium text-foreground">
                {client.handedness === 'right' ? 'Pravák' : 
                 client.handedness === 'left' ? 'Levák' : 
                 client.handedness === 'ambidextrous' ? 'Obouruký' : '—'}
              </p>
            </div>

            {/* Occupation */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Briefcase className="w-4 h-4" />
                Typ práce
              </div>
              <p className="font-medium text-foreground">
                {client.occupation === 'sedentary' ? 'Sedavá' : 
                 client.occupation === 'mixed' ? 'Kombinovaná' : 
                 client.occupation === 'active' ? 'Aktivní' : '—'}
              </p>
            </div>

            {/* Sitting Hours */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Activity className="w-4 h-4" />
                Hodiny vsedě denně
              </div>
              <p className="font-medium text-foreground">
                {client.sitting_hours_daily != null ? `${client.sitting_hours_daily}h` : '—'}
              </p>
            </div>

            {/* Sleep Hours */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Moon className="w-4 h-4" />
                Průměrný spánek
              </div>
              <p className="font-medium text-foreground">
                {client.sleep_hours != null ? `${client.sleep_hours}h` : '—'}
              </p>
            </div>

            {/* Stress Level */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Heart className="w-4 h-4" />
                Úroveň stresu
              </div>
              <p className="font-medium text-foreground">
                {client.stress_level != null ? `${client.stress_level}/10` : '—'}
              </p>
            </div>
          </div>

          {/* Sports History */}
          {client.sports_history && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <History className="w-4 h-4" />
                Sportovní historie
              </div>
              <p className="text-foreground whitespace-pre-wrap">{client.sports_history}</p>
            </div>
          )}

          {/* Current Activities */}
          {client.current_activities && client.current_activities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Dumbbell className="w-4 h-4" />
                Aktuální aktivity
              </div>
              <div className="flex flex-wrap gap-2">
                {client.current_activities.map((activity) => (
                  <span
                    key={activity}
                    className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-sm font-medium"
                  >
                    {getActivityLabel(activity)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Supplements */}
          {client.supplements && client.supplements.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Pill className="w-4 h-4" />
                Doplňky stravy
              </div>
              <div className="flex flex-wrap gap-2">
                {client.supplements.map((supplement) => (
                  <span
                    key={supplement}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-medium"
                  >
                    {getSupplementLabel(supplement)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dietary Restrictions */}
          {client.dietary_restrictions && client.dietary_restrictions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <Apple className="w-4 h-4" />
                Stravovací omezení
              </div>
              <div className="flex flex-wrap gap-2">
                {client.dietary_restrictions.map((restriction) => (
                  <span
                    key={restriction}
                    className="px-3 py-1.5 rounded-xl bg-warning/10 text-warning text-sm font-medium"
                  >
                    {getDietaryRestrictionLabel(restriction)}
                  </span>
                ))}
              </div>
            </div>
          )}
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

        {/* Pre-diagnostic Section */}
        <ClientPreDiagnosticSection clientId={client.id} clientName={client.name} />

        {/* Feedback History Section */}
        <FeedbackHistoryList clientId={client.id} />
      </Form>
    </div>
  );
}
