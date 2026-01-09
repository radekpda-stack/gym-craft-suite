/**
 * Legacy Price Fix Section
 * Allows toggling legacy pricing for a client with a fixed amount
 * Automatically disables when the fixed amount is exhausted
 */
import { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle, Check, Pencil } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegacyPriceFixSectionProps {
  clientId: string;
}

export function LegacyPriceFixSection({ clientId }: LegacyPriceFixSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [inputAmount, setInputAmount] = useState('');
  
  // Fetch client's legacy pricing status
  const { data: client } = useQuery({
    queryKey: ['client-legacy-status', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('use_legacy_pricing, grandfathered_credit, grandfathered_at')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch consumed amount since grandfathered_at
  const { data: consumedData } = useQuery({
    queryKey: ['grandfathered-consumed', clientId, client?.grandfathered_at],
    queryFn: async () => {
      if (!client?.grandfathered_at) return { consumed: 0 };
      
      const { data, error } = await supabase
        .from('credit_consumptions')
        .select('amount_czk')
        .eq('client_id', clientId)
        .gte('created_at', client.grandfathered_at);
      
      if (error) throw error;
      
      const consumed = data?.reduce((sum, item) => sum + (item.amount_czk || 0), 0) || 0;
      return { consumed };
    },
    enabled: !!client?.grandfathered_at && !!client?.use_legacy_pricing,
  });

  // Set input amount when client data loads
  useEffect(() => {
    if (client?.grandfathered_credit && !inputAmount) {
      setInputAmount(client.grandfathered_credit.toString());
    }
  }, [client?.grandfathered_credit]);

  const toggleLegacyPricing = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        // When enabling, just set the flag - user will enter amount
        const { error } = await supabase
          .from('clients')
          .update({
            use_legacy_pricing: true,
            grandfathered_at: new Date().toISOString(),
          })
          .eq('id', clientId);

        if (error) throw error;
        setIsEditing(true);
        setInputAmount('');
      } else {
        // When disabling, clear the flag
        const { error } = await supabase
          .from('clients')
          .update({ use_legacy_pricing: false })
          .eq('id', clientId);

        if (error) throw error;
        setIsEditing(false);
      }
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['client-legacy-status', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (!enabled) {
        toast.success('Fixace staré ceny deaktivována');
      }
    },
    onError: () => {
      toast.error('Nepodařilo se změnit nastavení');
    },
  });

  const saveAmount = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase
        .from('clients')
        .update({
          grandfathered_credit: amount,
          grandfathered_at: client?.grandfathered_at || new Date().toISOString(),
        })
        .eq('id', clientId);

      if (error) throw error;
      return amount;
    },
    onSuccess: (amount) => {
      queryClient.invalidateQueries({ queryKey: ['client-legacy-status', clientId] });
      queryClient.invalidateQueries({ queryKey: ['grandfathered-consumed', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditing(false);
      toast.success(`Fixace nastavena na ${amount.toLocaleString('cs-CZ')} Kč`);
    },
    onError: () => {
      toast.error('Nepodařilo se uložit částku');
    },
  });

  const handleSaveAmount = () => {
    const amount = parseFloat(inputAmount.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast.error('Zadejte platnou částku');
      return;
    }
    saveAmount.mutate(amount);
  };

  const MIN_TRAINING_PRICE = 800; // Minimum training price for 1 participant
  
  const isLegacyEnabled = client?.use_legacy_pricing ?? false;
  const grandfatheredCredit = client?.grandfathered_credit ?? 0;
  const consumed = consumedData?.consumed ?? 0;
  const remaining = Math.max(0, grandfatheredCredit - consumed);
  const percentUsed = grandfatheredCredit > 0 ? Math.min(100, (consumed / grandfatheredCredit) * 100) : 0;
  const hasFixedAmount = grandfatheredCredit > 0;
  const showInput = isLegacyEnabled && (isEditing || !hasFixedAmount);
  const isInsufficientForNextTraining = remaining > 0 && remaining < MIN_TRAINING_PRICE;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLegacyEnabled ? (
            <Lock className="w-4 h-4 text-primary" />
          ) : (
            <Unlock className="w-4 h-4 text-muted-foreground" />
          )}
          <Label htmlFor="legacy-pricing" className="text-sm font-medium cursor-pointer">
            Fixace staré ceny
          </Label>
        </div>
        <Switch
          id="legacy-pricing"
          checked={isLegacyEnabled}
          onCheckedChange={(checked) => toggleLegacyPricing.mutate(checked)}
          disabled={toggleLegacyPricing.isPending}
        />
      </div>

      {showInput && (
        <div className="pl-6 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Částka k fixaci za staré ceny
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="např. 5000"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Kč
                </span>
              </div>
              <Button 
                size="sm" 
                onClick={handleSaveAmount}
                disabled={saveAmount.isPending || !inputAmount}
              >
                <Check className="w-4 h-4 mr-1" />
                Uložit
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Po vyčerpání se automaticky přejde na nový ceník (od 1.2.2026)</span>
          </div>
        </div>
      )}

      {isLegacyEnabled && hasFixedAmount && !isEditing && (
        <div className="pl-6 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Zbývá z fixace</span>
              <span className="font-medium">
                {remaining.toLocaleString('cs-CZ')} / {grandfatheredCredit.toLocaleString('cs-CZ')} Kč
              </span>
            </div>
            <Progress value={100 - percentUsed} className="h-2" />
          </div>
          
          {remaining === 0 ? (
            <div className="flex items-start gap-2 text-xs text-amber-500">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Fixace vyčerpána. Při dalším tréninku se použije nový ceník.</span>
            </div>
          ) : isInsufficientForNextTraining ? (
            <div className="flex items-start gap-2 text-xs text-amber-500">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Zbývající kredit ({remaining.toLocaleString('cs-CZ')} Kč) nestačí na další trénink (min. {MIN_TRAINING_PRICE} Kč). 
                Fixace bude automaticky ukončena při příštím tréninku.
              </span>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => {
                setInputAmount(grandfatheredCredit.toString());
                setIsEditing(true);
              }}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Upravit částku
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
