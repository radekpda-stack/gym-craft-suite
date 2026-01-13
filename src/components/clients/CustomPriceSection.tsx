import { useState, useEffect, useCallback } from 'react';
import { Tag, X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

interface CustomPriceSectionProps {
  clientId: string;
  currentPrice: number | null;
  currentNote: string | null;
  currentCreditLimit: number | null;
  currentCreditBalance: number;
}

export function CustomPriceSection({
  clientId,
  currentPrice,
  currentNote,
  currentCreditLimit,
  currentCreditBalance,
}: CustomPriceSectionProps) {
  const [isEnabled, setIsEnabled] = useState(currentPrice !== null);
  const [price, setPrice] = useState(currentPrice?.toString() || '');
  const [note, setNote] = useState(currentNote || '');
  const [creditLimit, setCreditLimit] = useState(currentCreditLimit?.toString() || '');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if prepaid budget is exhausted
  const isExhausted = currentCreditLimit !== null && currentCreditBalance <= currentCreditLimit;

  // Sync state when props change (when data is refetched)
  useEffect(() => {
    setIsEnabled(currentPrice !== null);
    setPrice(currentPrice?.toString() || '');
    setNote(currentNote || '');
    setCreditLimit(currentCreditLimit?.toString() || '');
  }, [currentPrice, currentNote, currentCreditLimit]);

  // Calculate if there are unsaved changes
  const hasChanges = useCallback(() => {
    const wasEnabled = currentPrice !== null;
    
    // If enabled state changed
    if (isEnabled !== wasEnabled) {
      // If we're enabling, we need a price to save
      if (isEnabled) {
        return price.trim() !== '';
      }
      // If we're disabling, always allow save
      return true;
    }
    
    // If both disabled, no changes
    if (!isEnabled && !wasEnabled) {
      return false;
    }
    
    // If enabled, check if values changed
    const priceChanged = price !== (currentPrice?.toString() || '');
    const noteChanged = note !== (currentNote || '');
    const limitChanged = creditLimit !== (currentCreditLimit?.toString() || '');
    
    return priceChanged || noteChanged || limitChanged;
  }, [isEnabled, price, note, creditLimit, currentPrice, currentNote, currentCreditLimit]);

  const updateCustomPrice = useMutation({
    mutationFn: async (data: { 
      custom_training_price: number | null; 
      custom_price_note: string | null;
      custom_price_credit_limit: number | null;
    }) => {
      const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    },
  });

  const handleSave = () => {
    if (!isEnabled) {
      // Disabling custom price
      updateCustomPrice.mutate(
        {
          custom_training_price: null,
          custom_price_note: null,
          custom_price_credit_limit: null,
        },
        {
          onSuccess: () => {
            toast({
              title: 'Vlastní cena zrušena',
              description: 'Klient bude používat standardní ceník',
            });
          },
          onError: (error) => {
            console.error('Failed to disable custom price:', error);
            toast({
              title: 'Chyba',
              description: 'Nepodařilo se zrušit vlastní cenu',
              variant: 'destructive',
            });
          },
        }
      );
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast({
        title: 'Neplatná cena',
        description: 'Zadejte platnou cenu za trénink',
        variant: 'destructive',
      });
      return;
    }

    const numericLimit = creditLimit.trim() ? parseFloat(creditLimit) : null;
    if (numericLimit !== null && isNaN(numericLimit)) {
      toast({
        title: 'Neplatný limit',
        description: 'Zadejte platnou částku pro upozornění',
        variant: 'destructive',
      });
      return;
    }
    
    updateCustomPrice.mutate(
      {
        custom_training_price: numericPrice,
        custom_price_note: note.trim() || null,
        custom_price_credit_limit: numericLimit,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Uloženo',
            description: `Vlastní cena ${formatCurrency(numericPrice)} nastavena`,
          });
        },
        onError: (error) => {
          console.error('Failed to save custom price:', error);
          toast({
            title: 'Chyba',
            description: 'Nepodařilo se uložit změny',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDisable = () => {
    setIsEnabled(false);
    setPrice('');
    setNote('');
    setCreditLimit('');
    
    updateCustomPrice.mutate(
      {
        custom_training_price: null,
        custom_price_note: null,
        custom_price_credit_limit: null,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Vlastní cena zrušena',
            description: 'Klient bude používat standardní ceník',
          });
        },
        onError: (error) => {
          console.error('Failed to disable custom price:', error);
          toast({
            title: 'Chyba',
            description: 'Nepodařilo se zrušit vlastní cenu',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const showSaveButton = hasChanges();
  const canSave = !updateCustomPrice.isPending && (!isEnabled || price.trim() !== '');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Vlastní ceník</Label>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={setIsEnabled}
        />
      </div>

      {/* Warning when exhausted */}
      {isEnabled && isExhausted && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium">Předplacený kredit vyčerpán!</p>
            <p className="text-muted-foreground mt-0.5">
              Kredit klienta ({formatCurrency(currentCreditBalance)}) dosáhl limitu ({formatCurrency(currentCreditLimit!)}).
              Zvažte vypnutí vlastního ceníku.
            </p>
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="space-y-3 pl-6">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Cena za trénink (jednotlivec)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="800"
                className="w-24"
                min="0"
              />
              <span className="text-sm text-muted-foreground">Kč</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Upozornit při kreditu pod (volitelné)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0"
                className="w-24"
                min="0"
              />
              <span className="text-sm text-muted-foreground">Kč</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Např. 0 = upozorní až dojde do nuly, 500 = upozorní když zbyde 500 Kč
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Poznámka (volitelné)
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Např. Předplaceno do 03/2025"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pl-6">
        {showSaveButton && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
            className="gap-1.5"
          >
            {updateCustomPrice.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Uložit
          </Button>
        )}
        {currentPrice !== null && !showSaveButton && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDisable}
            disabled={updateCustomPrice.isPending}
            className="text-muted-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Zrušit vlastní cenu
          </Button>
        )}
      </div>

      {!isEnabled && currentPrice === null && (
        <p className="text-xs text-muted-foreground pl-6">
          Klient používá standardní ceník
        </p>
      )}
    </div>
  );
}
