import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Calendar } from 'lucide-react';
import { useUpcomingAnniversaries } from '@/hooks/useClientAnniversaries';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export function UpcomingAnniversariesCard() {
  const upcomingAnniversaries = useUpcomingAnniversaries(7);

  if (upcomingAnniversaries.length === 0) {
    return null;
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          Nadcházející výročí
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingAnniversaries.map((item) => (
          <Link
            key={item.client.id}
            to={`/clients/${item.client.id}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-amber-500">
                  {item.years}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{item.client.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.years} {item.years === 1 ? 'rok' : item.years < 5 ? 'roky' : 'let'} spolupráce
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {item.daysUntil === 0 
                ? 'Dnes' 
                : item.daysUntil === 1 
                  ? 'Zítra' 
                  : format(item.anniversaryDate, 'd. M.', { locale: cs })}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
