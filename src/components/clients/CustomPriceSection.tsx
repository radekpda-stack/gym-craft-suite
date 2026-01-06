import { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomPriceSectionProps {
  clientId: string;
  currentPrice: number | null;
  currentNote: string | null;
}

export function CustomPriceSection({
  clientId,
  currentPrice,
  currentNote,
}: CustomPriceSectionProps) {
  const [isEnabled, setIsEnabled] = useState(currentPrice !== null);
  const [price, setPrice] = useState(currentPrice?.toString() || '');
  const [note, setNote] = useState(currentNote || '');
  const [hasChanges, setHasChanges] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sync state when props change
  useEffect(() => {
    setIsEnabled(currentPrice !== null);
    setPrice(currentPrice?.toString() || '');
    setNote(currentNote || '');
  }, [currentPrice, currentNote]);

  // Track changes
  useEffect(() => {
    const priceChanged = isEnabled 
      ? (price !== (currentPrice?.toString() || ''))
      : currentPrice !== null;
    const noteChanged = note !== (currentNote || '');
    setHasChanges(priceChanged || noteChanged || (isEnabled !== (currentPrice !== null)));
  }, [isEnabled, price, note, currentPrice, currentNote]);

  const updateCustomPrice = useMutation({
    mutationFn: async (data: { custom_training_price: number | null; custom_price_note: string | null }) => {
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
    
    updateCustomPrice.mutate(
      {
        custom_training_price: numericPrice,
        custom_price_note: isEnabled ? note || null : null,
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
    
    updateCustomPrice.mutate(
      {
        custom_training_price: null,
        custom_price_note: null,
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
