/**
 * PriceListSettings Component
 * 
 * Manages current and future price lists with:
 * - Display of active price list
 * - Form to create a new future price list
 * - Countdown to next price change
 * - Info about grandfathered clients
 */
import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Clock, Users, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { usePriceLists, useUpcomingPriceList, useCreatePriceList, useDeletePriceList } from '@/hooks/usePriceLists';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { usePriceTransition } from '@/hooks/usePriceTransition';
import { toast } from 'sonner';

interface PriceInputs {
  PT_1: number;
  PT_2: number;
  PT_3P: number;
  first_training: number;
}

export function PriceListSettings() {
  const { data: priceLists, isLoading } = usePriceLists();
  const { data: upcomingPriceList } = useUpcomingPriceList();
  const { data: settings } = useAppSettings();
  const updateSetting = useUpdateSetting();
  const createPriceList = useCreatePriceList();
  const deletePriceList = useDeletePriceList();
  const { clientsOnLegacyPricing } = usePriceTransition();

  // Current prices from app_settings
  const currentPrices: PriceInputs = settings?.training_prices || {
    PT_1: 800,
    PT_2: 1000,
    PT_3P: 1200,
    first_training: 1000,
  };

  // Map old keys to new keys for display
  const displayCurrentPrices = {
    PT_1: currentPrices["1"] || currentPrices.PT_1 || 800,
    PT_2: currentPrices["2"] || currentPrices.PT_2 || 1000,
    PT_3P: currentPrices["3"] || currentPrices.PT_3P || 1200,
    first_training: currentPrices.first_training || 1000,
  };

  // State for new price list form
  const [showNewForm, setShowNewForm] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(undefined);
  const [newPrices, setNewPrices] = useState<PriceInputs>({
    PT_1: displayCurrentPrices.PT_1 + 100,
    PT_2: displayCurrentPrices.PT_2 + 100,
    PT_3P: displayCurrentPrices.PT_3P + 100,
    first_training: displayCurrentPrices.first_training,
  });
  const [monthlyGoal, setMonthlyGoal] = useState(settings?.monthly_income_goal || 100000);

  useEffect(() => {
    if (settings?.monthly_income_goal) {
      setMonthlyGoal(settings.monthly_income_goal);
    }
  }, [settings]);

  // Check if there's already an upcoming price list
  const hasUpcoming = !!upcomingPriceList;
  const daysUntil = upcomingPriceList?.days_until || 0;

  // Get grandfathered clients count from usePriceTransition
  const grandfatheredClientsCount = clientsOnLegacyPricing?.length || 0;

  const handleCreatePriceList = async () => {
    if (!effectiveDate) {
      toast.error('Vyberte datum platnosti');
      return;
    }

    try {
      await createPriceList.mutateAsync({
        name: `Ceník od ${format(effectiveDate, 'd.M.yyyy')}`,
        effectiveFrom: effectiveDate,
        prices: newPrices,
      });
      
      toast.success('Nový ceník vytvořen');
      setShowNewForm(false);
      setEffectiveDate(undefined);
    } catch (error) {
      toast.error('Chyba při vytváření ceníku');
    }
  };

  const handleDeleteUpcoming = async () => {
    if (!upcomingPriceList?.id) return;
    
    try {
      await deletePriceList.mutateAsync(upcomingPriceList.id);
      toast.success('Naplánovaný ceník zrušen');
    } catch (error) {
      toast.error('Chyba při rušení ceníku');
    }
  };

  const handleMonthlyGoalBlur = async () => {
    if (settings?.monthly_income_goal === monthlyGoal) return;
    try {
      await updateSetting.mutateAsync({ key: 'monthly_income_goal', value: monthlyGoal });
      toast.success('Měsíční cíl uložen');
    } catch {
      toast.error('Chyba při ukládání');
    }
  };

  const handleCurrentPriceChange = async (key: string, value: number) => {
    const mappedKey = key === 'PT_1' ? '1' : key === 'PT_2' ? '2' : key === 'PT_3P' ? '3' : key;
    const currentValue = currentPrices[mappedKey] || currentPrices[key];
    if (currentValue === value) return;

    try {
      await updateSetting.mutateAsync({
        key: 'training_prices',
        value: {
          ...currentPrices,
          [mappedKey]: value,
        },
      });
      toast.success('Cena uložena');
    } catch {
      toast.error('Chyba při ukládání');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Prices Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="bg-success/20 text-success border-0">
            <Check className="w-3 h-3 mr-1" />
            Aktivní
          </Badge>
          <span className="text-sm text-muted-foreground">Aktuální ceny</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <PriceInput
            label="1 osoba"
            value={displayCurrentPrices.PT_1}
            onBlur={(v) => handleCurrentPriceChange('PT_1', v)}
          />
          <PriceInput
            label="2 osoby"
            value={displayCurrentPrices.PT_2}
            onBlur={(v) => handleCurrentPriceChange('PT_2', v)}
          />
          <PriceInput
            label="3+ osoby"
            value={displayCurrentPrices.PT_3P}
            onBlur={(v) => handleCurrentPriceChange('PT_3P', v)}
          />
          <PriceInput
            label="1. trénink"
            value={displayCurrentPrices.first_training}
            onBlur={(v) => handleCurrentPriceChange('first_training', v)}
          />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t" />

      {/* Monthly Goal */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Měsíční cíl příjmu</Label>
        <div className="relative max-w-xs">
          <Input
            type="number"
            value={monthlyGoal}
            onChange={(e) => setMonthlyGoal(parseInt(e.target.value) || 0)}
            onBlur={handleMonthlyGoalBlur}
            className="pr-10 text-lg font-semibold"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            Kč
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Zobrazuje se jako gauge na statistikách
        </p>
      </div>

      {/* Separator */}
      <div className="border-t" />

      {/* Upcoming Price List */}
      {hasUpcoming ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="font-medium text-warning">
                Naplánovaná změna cen
              </span>
            </div>
            <Badge variant="outline" className="border-warning/50 text-warning">
              za {daysUntil} {daysUntil === 1 ? 'den' : daysUntil < 5 ? 'dny' : 'dní'}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3">
            {upcomingPriceList?.name} - platný od{' '}
            {upcomingPriceList?.effective_from && format(new Date(upcomingPriceList.effective_from), 'd. MMMM yyyy', { locale: cs })}
          </p>

          {grandfatheredClientsCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Users className="w-4 h-4" />
              <span>
                {grandfatheredClientsCount} klientů s fixací starých cen
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDeleteUpcoming}
            disabled={deletePriceList.isPending}
          >
            {deletePriceList.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Zrušit naplánovanou změnu
          </Button>
        </div>
      ) : showNewForm ? (
        <div className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Nový ceník</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewForm(false)}
            >
              Zrušit
            </Button>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-sm">Platný od</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !effectiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveDate ? (
                    format(effectiveDate, "d. MMMM yyyy", { locale: cs })
                  ) : (
                    "Vyberte datum"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDate}
                  onSelect={setEffectiveDate}
                  disabled={(date) => date <= new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* New Prices */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PriceInput
              label="1 osoba"
              value={newPrices.PT_1}
              onChange={(v) => setNewPrices(p => ({ ...p, PT_1: v }))}
            />
            <PriceInput
              label="2 osoby"
              value={newPrices.PT_2}
              onChange={(v) => setNewPrices(p => ({ ...p, PT_2: v }))}
            />
            <PriceInput
              label="3+ osoby"
              value={newPrices.PT_3P}
              onChange={(v) => setNewPrices(p => ({ ...p, PT_3P: v }))}
            />
            <PriceInput
              label="1. trénink"
              value={newPrices.first_training}
              onChange={(v) => setNewPrices(p => ({ ...p, first_training: v }))}
            />
          </div>

          {/* Price difference preview */}
          <div className="text-xs text-muted-foreground">
            <span>Změna: </span>
            {newPrices.PT_1 !== displayCurrentPrices.PT_1 && (
              <span className="text-amber-600">
                1os: {newPrices.PT_1 > displayCurrentPrices.PT_1 ? '+' : ''}{newPrices.PT_1 - displayCurrentPrices.PT_1} Kč
              </span>
            )}
          </div>

          <Button
            onClick={handleCreatePriceList}
            disabled={!effectiveDate || createPriceList.isPending}
            className="w-full"
          >
            {createPriceList.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Vytvořit nový ceník
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowNewForm(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Naplánovat změnu cen
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Změny aktuálních cen se automaticky ukládají. Nový ceník se aktivuje v nastavený den.
      </p>
    </div>
  );
}

// Helper component for price inputs
interface PriceInputProps {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  onBlur?: (value: number) => void;
}

function PriceInput({ label, value, onChange, onBlur }: PriceInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-sm">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={localValue}
          onChange={(e) => {
            const v = parseInt(e.target.value) || 0;
            setLocalValue(v);
            onChange?.(v);
          }}
          onBlur={() => onBlur?.(localValue)}
          className="pr-10 text-lg font-semibold"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          Kč
        </span>
      </div>
    </div>
  );
}
