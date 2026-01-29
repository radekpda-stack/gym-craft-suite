/**
 * ClientFeedbackLeaderboard - Aggregated client metrics table
 * Shows which clients need the most attention based on feedback data
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { subDays } from 'date-fns';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

type SortField = 'feedback_count' | 'avg_body_feel' | 'avg_pain' | 'red_flags';
type SortOrder = 'asc' | 'desc';

interface ClientMetrics {
  clientId: string;
  clientName: string;
  feedbackCount: number;
  avgBodyFeel: number | null;
  avgPain: number | null;
  avgEnergy: number | null;
  redFlagCount: number;
  severity: 'ok' | 'warning' | 'critical';
}

interface ClientFeedbackLeaderboardProps {
  days?: number;
  limit?: number;
  onClientClick?: (clientId: string) => void;
}

export function ClientFeedbackLeaderboard({
  days = 30,
  limit = 10,
  onClientClick,
}: ClientFeedbackLeaderboardProps) {
  const [sortField, setSortField] = useState<SortField>('avg_pain');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const { data: clients = [] } = useClients();

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['client-feedback-leaderboard', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);

      const { data: feedbacks, error } = await supabase
        .from('training_feedback')
        .select('client_id, body_feel, pain, energy_rating, is_red_flag')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;
      return feedbacks;
    },
  });

  // Calculate aggregated metrics per client
  const clientMetrics = useMemo<ClientMetrics[]>(() => {
    if (!metricsData || metricsData.length === 0) return [];

    // Group by client
    const grouped: Record<string, typeof metricsData> = {};
    metricsData.forEach((f) => {
      if (!grouped[f.client_id]) {
        grouped[f.client_id] = [];
      }
      grouped[f.client_id].push(f);
    });

    // Calculate metrics
    return Object.entries(grouped).map(([clientId, feedbacks]) => {
      const client = clients.find((c) => c.id === clientId);
      
      const bodyFeels = feedbacks.filter((f) => f.body_feel !== null);
      const pains = feedbacks.filter((f) => f.pain !== null);
      const energies = feedbacks.filter((f) => f.energy_rating !== null);

      const avgBodyFeel = bodyFeels.length > 0
        ? bodyFeels.reduce((sum, f) => sum + (f.body_feel || 0), 0) / bodyFeels.length
        : null;
      
      const avgPain = pains.length > 0
        ? pains.reduce((sum, f) => sum + (f.pain || 0), 0) / pains.length
        : null;
      
      const avgEnergy = energies.length > 0
        ? energies.reduce((sum, f) => sum + (f.energy_rating || 0), 0) / energies.length
        : null;

      const redFlagCount = feedbacks.filter((f) => f.is_red_flag).length;

      // Determine severity
      let severity: 'ok' | 'warning' | 'critical' = 'ok';
      if (redFlagCount > 0 || (avgPain !== null && avgPain >= 6)) {
        severity = 'critical';
      } else if ((avgPain !== null && avgPain >= 4) || (avgBodyFeel !== null && avgBodyFeel <= 5)) {
        severity = 'warning';
      }

      return {
        clientId,
        clientName: client?.name || 'Neznámý klient',
        feedbackCount: feedbacks.length,
        avgBodyFeel,
        avgPain,
        avgEnergy,
        redFlagCount,
        severity,
      };
    });
  }, [metricsData, clients]);

  // Sort metrics
  const sortedMetrics = useMemo(() => {
    return [...clientMetrics]
      .sort((a, b) => {
        let aVal: number;
        let bVal: number;

        switch (sortField) {
          case 'feedback_count':
            aVal = a.feedbackCount;
            bVal = b.feedbackCount;
            break;
          case 'avg_body_feel':
            aVal = a.avgBodyFeel ?? 0;
            bVal = b.avgBodyFeel ?? 0;
            break;
          case 'avg_pain':
            aVal = a.avgPain ?? 0;
            bVal = b.avgPain ?? 0;
            break;
          case 'red_flags':
            aVal = a.redFlagCount;
            bVal = b.redFlagCount;
            break;
          default:
            return 0;
        }

        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      })
      .slice(0, limit);
  }, [clientMetrics, sortField, sortOrder, limit]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'desc' ? (
      <ArrowDown className="w-3 h-3" />
    ) : (
      <ArrowUp className="w-3 h-3" />
    );
  };

  const SEVERITY_COLORS = {
    ok: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
  };

  const SEVERITY_BG = {
    ok: 'bg-success/10',
    warning: 'bg-warning/10',
    critical: 'bg-destructive/10',
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Přehled klientů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedMetrics.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Přehled klientů za {days} dní
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Žádné feedbacky za vybrané období</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Přehled klientů za {days} dní
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide pb-2 border-b">
          <span>Klient</span>
          <button
            onClick={() => handleSort('feedback_count')}
            className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
          >
            Feedbacků
            <SortIcon field="feedback_count" />
          </button>
          <button
            onClick={() => handleSort('avg_body_feel')}
            className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
          >
            Ø Pocit
            <SortIcon field="avg_body_feel" />
          </button>
          <button
            onClick={() => handleSort('avg_pain')}
            className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
          >
            Ø Bolest
            <SortIcon field="avg_pain" />
          </button>
          <button
            onClick={() => handleSort('red_flags')}
            className="flex items-center gap-1 justify-end hover:text-foreground transition-colors"
          >
            <AlertTriangle className="w-3 h-3" />
            <SortIcon field="red_flags" />
          </button>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border/50">
          {sortedMetrics.map((metric) => (
            <button
              key={metric.clientId}
              onClick={() => onClientClick?.(metric.clientId)}
              className={cn(
                'grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 py-3 w-full text-left hover:bg-secondary/50 -mx-2 px-2 rounded-lg transition-colors',
                SEVERITY_BG[metric.severity]
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn('w-2 h-2 rounded-full shrink-0', {
                  'bg-success': metric.severity === 'ok',
                  'bg-warning': metric.severity === 'warning',
                  'bg-destructive': metric.severity === 'critical',
                })} />
                <span className="font-medium truncate">{metric.clientName}</span>
              </div>
              <span className="text-sm text-right tabular-nums">
                {metric.feedbackCount}
              </span>
              <span className={cn('text-sm text-right tabular-nums font-medium', {
                'text-destructive': metric.avgBodyFeel !== null && metric.avgBodyFeel <= 4,
                'text-warning': metric.avgBodyFeel !== null && metric.avgBodyFeel > 4 && metric.avgBodyFeel <= 6,
                'text-success': metric.avgBodyFeel !== null && metric.avgBodyFeel > 6,
              })}>
                {metric.avgBodyFeel !== null ? metric.avgBodyFeel.toFixed(1) : '—'}
              </span>
              <span className={cn('text-sm text-right tabular-nums font-medium', {
                'text-destructive': metric.avgPain !== null && metric.avgPain >= 6,
                'text-warning': metric.avgPain !== null && metric.avgPain >= 4 && metric.avgPain < 6,
                'text-success': metric.avgPain !== null && metric.avgPain < 4,
              })}>
                {metric.avgPain !== null ? metric.avgPain.toFixed(1) : '—'}
              </span>
              <span className="text-sm text-right">
                {metric.redFlagCount > 0 ? (
                  <Badge variant="destructive" className="text-xs px-1.5">
                    {metric.redFlagCount}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
