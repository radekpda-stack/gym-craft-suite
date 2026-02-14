import { useState } from 'react';
import { AnalyticsCard } from './AnalyticsCard';
import { AlertTriangle, ChevronDown, User, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface StagnatingClient {
  clientId: string;
  clientName: string;
  exerciseName: string;
  weeksStagnant: number;
  lastValue: number;
}

interface StagnationAlertCardProps {
  data: StagnatingClient[];
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Stagnace klientů',
  description: 'Seznam klientů a cviků, kde nedošlo k progresu (zvýšení váhy nebo opakování) po 3+ týdny.',
  calculation: 'Detekce stagnace na základě porovnání max hodnot za posledních 8 týdnů',
};

export function StagnationAlertCard({ data, isLoading }: StagnationAlertCardProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isEmpty = !data || data.length === 0;

  const toggleExpand = (key: string) => {
    setExpandedId(prev => prev === key ? null : key);
  };

  return (
    <AnalyticsCard
      title="Stagnace"
      icon={AlertTriangle}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Žádná stagnace – všichni progresují! 🎉"
    >
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {data.slice(0, 5).map((item, idx) => {
          const key = `${item.clientId}-${item.exerciseName}-${idx}`;
          const isExpanded = expandedId === key;
          return (
            <div key={key}>
              <button
                onClick={() => toggleExpand(key)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg text-left",
                  "bg-muted/30 hover:bg-muted/50 transition-colors",
                  "group cursor-pointer",
                  isExpanded && "bg-muted/50"
                )}
              >
                <div className="p-1.5 rounded-full bg-warning/10 shrink-0">
                  <User className="w-3 h-3 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.clientName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.exerciseName}</p>
                </div>
                <Badge variant="warning" className="shrink-0 text-[9px]">
                  {item.weeksStagnant}+ týdnů
                </Badge>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0",
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
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Poslední hodnota</span>
                        <span className="font-medium text-foreground">{item.lastValue} kg</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Bez progresu</span>
                        <span className="font-medium text-foreground">{item.weeksStagnant} týdnů</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${item.clientId}?tab=progress`);
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
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {data.length} {data.length === 1 ? 'klient stagnuje' : data.length < 5 ? 'klienti stagnují' : 'klientů stagnuje'}
        </p>
      )}
    </AnalyticsCard>
  );
}
