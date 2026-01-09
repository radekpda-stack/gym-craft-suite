/**
 * Legacy Price Fix Section
 * Allows toggling legacy pricing for a client until their credit is exhausted
 */
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useClientCreditSummary } from '@/hooks/useCreditLots';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LegacyPriceFixSectionProps {
  clientId: string;
}

export function LegacyPriceFixSection({ clientId }: LegacyPriceFixSectionProps) {
  const queryClient = useQueryClient();
  
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

  // Fetch credit summary to show remaining legacy credit
  const { data: creditSummary } = useClientCreditSummary(clientId);

  const toggleLegacyPricing = useMutation({
    mutationFn: async (enabled: boolean) => {
      const updateData: Record<string, any> = {
        use_legacy_pricing: enabled,
      };
      
      // If enabling, set grandfathered_at if not already set
      if (enabled && !client?.grandfathered_at) {
        updateData.grandfathered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['client-legacy-status', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(enabled ? 'Fixace staré ceny aktivována' : 'Fixace staré ceny deaktivována');
    },
    onError: () => {
      toast.error('Nepodařilo se změnit nastavení');
    },
  });

  const isLegacyEnabled = client?.use_legacy_pricing ?? false;
  const remainingOldCredit = creditSummary?.old_balance ?? 0;
  const hasOldCredit = remainingOldCredit > 0;

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

      {isLegacyEnabled && (
        <div className="pl-6 space-y-2">
          {hasOldCredit ? (
            <div className="text-xs text-muted-foreground">
              Zbývá: <span className="font-medium text-foreground">{remainingOldCredit.toLocaleString('cs-CZ')} Kč</span> za staré ceny
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-amber-500">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Kredit za staré ceny je vyčerpán. Při dalším tréninku se použije nový ceník.</span>
            </div>
          )}
        </div>
      )}

      {!isLegacyEnabled && hasOldCredit && (
        <p className="pl-6 text-xs text-muted-foreground">
          Klient má {remainingOldCredit.toLocaleString('cs-CZ')} Kč nakoupených za staré ceny
        </p>
      )}
    </div>
  );
}
