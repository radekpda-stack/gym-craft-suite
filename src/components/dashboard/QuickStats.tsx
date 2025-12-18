import { useState } from 'react';
import { 
  BarChart3,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Users,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { formatCurrency, formatPercent } from '@/lib/formatters';

export function QuickStats() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: kpis, isLoading } = useDashboardKPIs();
  
  const stats = [
    {
      id: 'trainings',
      label: 'Tréninky tento měsíc',
      value: kpis?.trainingsThisMonth || 0,
      icon: Dumbbell,
    },
    {
      id: 'clients',
      label: 'Aktivní klienti',
      value: kpis?.activeClients || 0,
      icon: Users,
    },
    {
      id: 'new',
      label: 'Noví klienti',
      value: kpis?.newClientsThisMonth || 0,
      icon: MessageSquare,
    },
    {
      id: 'income',
      label: 'Příjem tento měsíc',
      value: formatCurrency(kpis?.trainingIncome || 0),
      icon: TrendingUp,
    },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Statistiky
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {stats.map(stat => (
                <div
                  key={stat.id}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/30"
                >
                  <stat.icon className="w-5 h-5 text-primary" />
                  <span className="text-lg font-bold text-foreground">{stat.value}</span>
                  <span className="text-xs text-muted-foreground text-center">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
