import { useState } from 'react';
import { AnalyticsCard } from './AnalyticsCard';
import { Users, AlertCircle, ChevronDown, TrendingDown, Trophy, Scale, Flame, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export type AttentionReason = 'no_pr' | 'declining_frequency' | 'high_asymmetry' | 'chronic_high_rpe';

export interface ClientNeedingAttention {
  clientId: string;
  clientName: string;
  reasons: AttentionReason[];
  priority: 'high' | 'medium' | 'low';
}

interface ClientAttentionCardProps {
  data: ClientNeedingAttention[];
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Klienti vyžadující pozornost',
  description: 'Seznam klientů s indikátory, které vyžadují pozornost trenéra.',
  calculation: 'Kritéria: žádné PR za 30 dní, klesající frekvence, vysoká asymetrie (>20%), chronicky vysoké RPE (≥9 po 3+ týdny)',
};

const REASON_CONFIG: Record<AttentionReason, { icon: typeof Trophy; label: string; description: string; color: string }> = {
  no_pr: { icon: Trophy, label: 'Žádné PR', description: 'Žádný osobní rekord za posledních 30 dní', color: 'text-warning' },
  declining_frequency: { icon: TrendingDown, label: 'Klesá frekvence', description: 'Frekvence tréninků klesá oproti předchozímu období', color: 'text-destructive' },
  high_asymmetry: { icon: Scale, label: 'Asymetrie', description: 'Rozdíl mezi stranami přesahuje 20%', color: 'text-orange-500' },
  chronic_high_rpe: { icon: Flame, label: 'Vysoké RPE 3+ týdny', description: 'RPE ≥ 9 trvale po 3 a více týdnů', color: 'text-destructive' },
};

const PRIORITY_CONFIG = {
  high: { badge: 'destructive' as const, label: 'Vysoká' },
  medium: { badge: 'warning' as const, label: 'Střední' },
  low: { badge: 'secondary' as const, label: 'Nízká' },
};

export function ClientAttentionCard({ data, isLoading }: ClientAttentionCardProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isEmpty = !data || data.length === 0;

  const toggleExpand = (clientId: string) => {
    setExpandedId(prev => prev === clientId ? null : clientId);
  };

  // Sort by priority
  const sortedData = [...data].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const highPriorityCount = data.filter(d => d.priority === 'high').length;

  return (
    <AnalyticsCard
      title="Vyžadují pozornost"
      icon={Users}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Všichni klienti jsou na dobré cestě! ✨"
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
        {sortedData.slice(0, 6).map((client) => {
          const isExpanded = expandedId === client.clientId;
          return (
            <div key={client.clientId}>
              <button
                onClick={() => toggleExpand(client.clientId)}
                className={cn(
                  "w-full flex items-start gap-2 p-2.5 rounded-lg text-left",
                  "bg-muted/30 hover:bg-muted/50 transition-colors",
                  "group cursor-pointer",
                  client.priority === 'high' && "border border-destructive/20 bg-destructive/5",
                  isExpanded && "bg-muted/50"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-full shrink-0",
                  client.priority === 'high' ? "bg-destructive/10" : "bg-muted"
                )}>
                  <AlertCircle className={cn(
                    "w-3.5 h-3.5",
                    client.priority === 'high' ? "text-destructive" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-medium truncate">{client.clientName}</p>
                    <Badge 
                      variant={PRIORITY_CONFIG[client.priority].badge} 
                      className="text-[8px] px-1 py-0"
                    >
                      {PRIORITY_CONFIG[client.priority].label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {client.reasons.map((reason) => {
                      const config = REASON_CONFIG[reason];
                      const Icon = config.icon;
                      return (
                        <span 
                          key={reason} 
                          className={cn("inline-flex items-center gap-0.5 text-[9px]", config.color)}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          {config.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 mt-1",
                  isExpanded && "rotate-180"
                )} />
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 ml-8 space-y-1.5 text-[11px]">
                      {client.reasons.map((reason) => {
                        const config = REASON_CONFIG[reason];
                        return (
                          <div key={reason} className="flex items-start gap-1.5 text-muted-foreground">
                            <span className={cn("font-medium", config.color)}>•</span>
                            <span>{config.description}</span>
                          </div>
                        );
                      })}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${client.clientId}`);
                        }}
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Otevřít kartu klienta
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {data.length > 0 && (
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>{data.length} klientů vyžaduje pozornost</span>
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="text-[9px]">
              {highPriorityCount} vysoká priorita
            </Badge>
          )}
        </div>
      )}
    </AnalyticsCard>
  );
}
