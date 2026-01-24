/**
 * Client vs Trainer Baseline comparison card
 * Shows how a specific client's feedback metrics compare to the average of all clients
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientVsBaseline } from '@/hooks/useTrainerFeedbackBaseline';
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMetric } from '@/lib/feedbackCalculations';

interface MetricBarProps {
  label: string;
  clientValue: number | null;
  baselineValue: number | null;
  difference: number | null;
  invertedBetter?: boolean; // For metrics where lower is better (pain, soreness)
}

function MetricBar({ label, clientValue, baselineValue, difference, invertedBetter }: MetricBarProps) {
  const clientPercent = clientValue ? (clientValue / 10) * 100 : 0;
  const baselinePercent = baselineValue ? (baselineValue / 10) * 100 : 0;
  
  const getTrendIcon = () => {
    if (difference === null || Math.abs(difference) < 0.3) {
      return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
    
    const isPositive = invertedBetter ? difference < 0 : difference > 0;
    
    if (isPositive) {
      return <TrendingUp className="h-3 w-3 text-primary" />;
    }
    return <TrendingDown className="h-3 w-3 text-muted-foreground" />;
  };
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatMetric(clientValue)}</span>
          <span className="text-muted-foreground text-xs">vs {formatMetric(baselineValue)}</span>
          <div className="flex items-center gap-0.5">
            {getTrendIcon()}
            <span className="text-xs text-muted-foreground">
              {difference !== null ? (difference > 0 ? '+' : '') + difference.toFixed(1) : '—'}
            </span>
          </div>
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Baseline bar */}
        <div 
          className="absolute inset-y-0 left-0 bg-muted-foreground/30 rounded-full"
          style={{ width: `${baselinePercent}%` }}
        />
        {/* Client bar */}
        <div 
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          style={{ width: `${clientPercent}%` }}
        />
      </div>
    </div>
  );
}

interface ClientOption {
  id: string;
  name: string;
}

export function ClientVsBaselineCard() {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  
  // Fetch clients for selector
  useEffect(() => {
    async function fetchClients() {
      setClientsLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - Supabase type instantiation depth issue
        const result = await supabase
          .from('clients')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        const data = result.data as ClientOption[] | null;
        setClients(data ?? []);
      } finally {
        setClientsLoading(false);
      }
    }
    fetchClients();
  }, []);
  
  const { data: comparison, isLoading } = useClientVsBaseline(selectedClientId, 90);
  
  if (clientsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Klient vs. Průměr
          </CardTitle>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Vyberte klienta" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedClientId ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Vyberte klienta pro porovnání s průměrem všech klientů
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !comparison ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nedostatek dat pro porovnání
          </div>
        ) : (
          <div className="space-y-4">
            <MetricBar 
              label="Pocit těla"
              clientValue={comparison.clientMetrics.avgBodyFeel}
              baselineValue={comparison.baselineMetrics.avgBodyFeel}
              difference={comparison.differences.bodyFeel}
            />
            <MetricBar 
              label="Svalovka"
              clientValue={comparison.clientMetrics.avgSoreness}
              baselineValue={comparison.baselineMetrics.avgSoreness}
              difference={comparison.differences.soreness}
              invertedBetter
            />
            <MetricBar 
              label="Energie"
              clientValue={comparison.clientMetrics.avgEnergy}
              baselineValue={comparison.baselineMetrics.avgEnergy}
              difference={comparison.differences.energy}
            />
            <MetricBar 
              label="Bolest"
              clientValue={comparison.clientMetrics.avgPain}
              baselineValue={comparison.baselineMetrics.avgPain}
              difference={comparison.differences.pain}
              invertedBetter
            />
            <MetricBar 
              label="Zábava"
              clientValue={comparison.clientMetrics.avgFun}
              baselineValue={comparison.baselineMetrics.avgFun}
              difference={comparison.differences.fun}
            />
            
            {/* Summary stats */}
            <div className="pt-3 border-t flex justify-between text-xs text-muted-foreground">
              <span>{comparison.clientMetrics.totalFeedbacks} feedbacků od klienta</span>
              <span>Míra odpovědí: {comparison.clientMetrics.responseRate}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
