import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChurnRisk } from '@/hooks/useChurnRisk';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingDown, CreditCard, XCircle, Frown, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

const RISK_ICONS: Record<string, React.ElementType> = {
  'Pokles frekvence >50%': TrendingDown,
  'Nezaplaceno >14 dní': CreditCard,
  'Vysoká míra zrušení': XCircle,
  'Klesající spokojenost': Frown,
  'Dlouhá pauza': Clock,
};

const RISK_COLORS: Record<string, string> = {
  'Pokles frekvence >50%': 'text-orange-500',
  'Nezaplaceno >14 dní': 'text-red-500',
  'Vysoká míra zrušení': 'text-amber-500',
  'Klesající spokojenost': 'text-purple-500',
  'Dlouhá pauza': 'text-blue-500',
};

function getRiskBadgeVariant(score: number): 'destructive' | 'secondary' {
  return score >= 70 ? 'destructive' : 'secondary';
}

export function ChurnRiskCard() {
  const { data, isLoading } = useChurnRisk();
  const navigate = useNavigate();

  const clients = data?.clients || [];
  const totalAtRisk = data?.summary.totalAtRisk || 0;

  if (isLoading) {
    return <Skeleton className="h-80 rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Rizikoví klienti
          </CardTitle>
          {totalAtRisk > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalAtRisk} {totalAtRisk === 1 ? 'klient' : totalAtRisk < 5 ? 'klienti' : 'klientů'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Klienti s vysokým rizikem odchodu (splňují ≥2 kritéria)
        </p>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
              <span className="text-2xl">🎉</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Žádní rizikoví klienti!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Všichni vaši klienti jsou v dobrém stavu
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-3">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="group p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {client.name}
                        </span>
                        <Badge variant={getRiskBadgeVariant(client.riskScore)} className="text-xs shrink-0">
                          {client.riskScore}%
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                  </div>

                  {/* Risk factors */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {client.riskFactors.map((factor) => {
                      const Icon = RISK_ICONS[factor.label] || AlertTriangle;
                      const color = RISK_COLORS[factor.label] || 'text-muted-foreground';
                      return (
                        <div
                          key={factor.label}
                          className="flex items-center gap-1 text-xs bg-background/50 px-2 py-0.5 rounded"
                        >
                          <Icon className={`h-3 w-3 ${color}`} />
                          <span className="text-muted-foreground">{factor.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recommended action */}
                  <div className="text-xs text-primary/80 bg-primary/5 px-2 py-1 rounded">
                    💡 {client.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
