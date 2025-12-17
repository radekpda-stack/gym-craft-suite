import { Link } from 'react-router-dom';
import { TrendingDown, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeedbackTrends } from '@/hooks/useFeedbackTrends';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function FeedbackTrendsCard() {
  const { data: trends = [], isLoading } = useFeedbackTrends();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            Negativní trendy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (trends.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
            Negativní trendy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <TrendingDown className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Žádné negativní trendy u klientů
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            Negativní trendy
            {trends.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {trends.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {trends.slice(0, 5).map((trend) => (
          <Link
            key={trend.clientId}
            to={`/clients/${trend.clientId}`}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg transition-colors",
              trend.severity === 'critical'
                ? "bg-destructive/10 hover:bg-destructive/20"
                : "bg-orange-500/10 hover:bg-orange-500/20"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                trend.severity === 'critical' ? "bg-destructive/20" : "bg-orange-500/20"
              )}>
                <AlertTriangle className={cn(
                  "w-4 h-4",
                  trend.severity === 'critical' ? "text-destructive" : "text-orange-500"
                )} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{trend.clientName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {trend.issues.join(', ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatDistanceToNow(new Date(trend.lastFeedbackDate), { 
                  addSuffix: true, 
                  locale: cs 
                })}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
        {trends.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{trends.length - 5} dalších klientů
          </p>
        )}
      </CardContent>
    </Card>
  );
}
