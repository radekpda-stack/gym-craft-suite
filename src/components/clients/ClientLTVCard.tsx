import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Banknote, Calendar, Dumbbell, CreditCard, ShoppingBag } from 'lucide-react';
import { useClientLTV } from '@/hooks/useClientLTV';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientLTVCardProps {
  clientId: string;
}

export function ClientLTVCard({ clientId }: ClientLTVCardProps) {
  const { data, isLoading } = useClientLTV(clientId);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const formatCurrency = (value: number) => `${value.toLocaleString('cs-CZ')} Kč`;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          Celoživotní hodnota (LTV)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main LTV value */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20 text-center">
          <p className="text-3xl font-bold text-success">
            {formatCurrency(data.totalRevenue)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Celkový příjem od klienta
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Dumbbell className="w-3.5 h-3.5" />
              <span className="text-xs">Tréninky</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(data.trainingRevenue)}</p>
            <p className="text-xs text-muted-foreground">{data.totalTrainings} tréninků</p>
          </div>

          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="text-xs">Produkty</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(data.productRevenue)}</p>
          </div>

          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Banknote className="w-3.5 h-3.5" />
              <span className="text-xs">Ø za trénink</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(data.avgRevenuePerTraining)}</p>
          </div>

          <div className="p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">Ø za měsíc</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(data.avgRevenuePerMonth)}</p>
          </div>
        </div>

        {/* Timeline info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>
            Klient {data.monthsActive} {data.monthsActive === 1 ? 'měsíc' : data.monthsActive < 5 ? 'měsíce' : 'měsíců'}
          </span>
          {data.firstTrainingDate && (
            <span>
              Od {format(new Date(data.firstTrainingDate), 'd. MMM yyyy', { locale: cs })}
            </span>
          )}
        </div>

        {/* Projected annual value */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Projekce na rok</span>
            </div>
            <p className="text-sm font-bold text-primary">
              {formatCurrency(data.projectedAnnualValue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
