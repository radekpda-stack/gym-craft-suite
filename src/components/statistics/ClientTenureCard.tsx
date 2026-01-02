import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';
import { differenceInMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface TenureBucket {
  label: string;
  count: number;
  color: string;
}

export function ClientTenureCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-tenure-distribution'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get all active clients with creation dates
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at')
        .eq('user_id', user.user.id)
        .eq('is_archived', false);

      if (!clients) return null;

      const now = new Date();
      
      // Calculate tenure for each client
      const tenures = clients.map(c => {
        const months = differenceInMonths(now, new Date(c.created_at));
        return { id: c.id, name: c.name, months };
      });

      // Bucket distribution
      const buckets: TenureBucket[] = [
        { label: '< 6 měsíců', count: 0, color: 'bg-primary' },
        { label: '6-12 měsíců', count: 0, color: 'bg-success' },
        { label: '1-2 roky', count: 0, color: 'bg-warning' },
        { label: '2+ roky', count: 0, color: 'bg-destructive' },
      ];

      tenures.forEach(t => {
        if (t.months < 6) buckets[0].count++;
        else if (t.months < 12) buckets[1].count++;
        else if (t.months < 24) buckets[2].count++;
        else buckets[3].count++;
      });

      // Calculate average
      const avgMonths = tenures.length > 0 
        ? tenures.reduce((sum, t) => sum + t.months, 0) / tenures.length 
        : 0;

      // Get longest clients
      const longestClients = [...tenures]
        .sort((a, b) => b.months - a.months)
        .slice(0, 3);

      return { 
        buckets, 
        avgMonths: Math.round(avgMonths * 10) / 10, 
        totalClients: tenures.length,
        longestClients
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const buckets = data?.buckets || [];
  const totalClients = data?.totalClients || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-primary" />
          Délka spolupráce
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average tenure */}
        <div className="text-center p-3 rounded-lg bg-primary/10">
          <p className="text-2xl font-bold">{data?.avgMonths || 0}</p>
          <p className="text-xs text-muted-foreground">měsíců průměrně</p>
        </div>

        {/* Distribution bars */}
        <div className="space-y-2">
          {buckets.map((bucket, i) => {
            const percentage = totalClients > 0 ? (bucket.count / totalClients) * 100 : 0;
            return (
              <div key={bucket.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className="font-medium">{bucket.count}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn('h-full rounded-full transition-all', bucket.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Longest clients */}
        {data?.longestClients && data.longestClients.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Nejdéle spolupracují</p>
            <div className="space-y-1">
              {data.longestClients.map((client, i) => (
                <div key={client.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{client.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {client.months >= 12 
                      ? `${Math.floor(client.months / 12)}r ${client.months % 12}m`
                      : `${client.months}m`
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
