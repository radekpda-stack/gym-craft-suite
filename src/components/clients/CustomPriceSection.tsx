import { useState, useEffect } from 'react';
import { Tag, X, AlertTriangle } from 'lucide-react';
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
  const [hasChanges, setHasChanges] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if prepaid budget is exhausted
  const isExhausted = currentCreditLimit !== null && currentCreditBalance <= currentCreditLimit;

  // Sync state when props change
  useEffect(() => {
    setIsEnabled(currentPrice !== null);
    setPrice(currentPrice?.toString() || '');
    setNote(currentNote || '');
    setCreditLimit(currentCreditLimit?.toString() || '');
  }, [currentPrice, currentNote, currentCreditLimit]);

  // Track changes
  useEffect(() => {
    const priceChanged = isEnabled 
      ? (price !== (currentPrice?.toString() || ''))
      : currentPrice !== null;
    const noteChanged = note !== (currentNote || '');
    const limitChanged = creditLimit !== (currentCreditLimit?.toString() || '');
    setHasChanges(priceChanged || noteChanged || limitChanged || (isEnabled !== (currentPrice !== null)));
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
      queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
    },
  });

  const handleSave = () => {
    const numericPrice = isEnabled && price ? parseFloat(price) : null;
    const numericLimit = isEnabled && creditLimit ? parseFloat(creditLimit) : null;
    
    updateCustomPrice.mutate(
      {
        custom_training_price: numericPrice,
        custom_price_note: isEnabled ? note || null : null,
        custom_price_credit_limit: numericLimit,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Uloženo',
            description: isEnabled 
              ? `Vlastní cena ${numericPrice} Kč nastavena`
              : 'Vlastní cena zrušena',
          });
          setHasChanges(false);
        },
        onError: () => {
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
          setHasChanges(false);
        },
      }
    );
  };

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
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
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

          <div className="flex gap-2">
            {hasChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateCustomPrice.isPending || !price}
              >
                Uložit
              </Button>
            )}
            {currentPrice !== null && (
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
        </div>
      )}

      {!isEnabled && currentPrice === null && (
        <p className="text-xs text-muted-foreground pl-6">
          Klient používá standardní ceník
        </p>
      )}
    </div>
  );
}
