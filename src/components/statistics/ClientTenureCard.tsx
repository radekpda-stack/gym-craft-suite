import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';
import { differenceInMonths, differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';

interface TenureBucket {
  label: string;
  count: number;
  color: string;
}

interface ClientTenure {
  id: string;
  name: string;
  months: number;
  firstTraining: Date | null;
}

export function ClientTenureCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-tenure-distribution'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get all active clients with training_start_date
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, created_at, training_start_date')
        .eq('user_id', user.user.id)
        .eq('is_archived', false);

      if (!clients || clients.length === 0) return null;

      const now = new Date();
      
      // Calculate tenure for each client based on training_start_date (preferred) or created_at (fallback)
      const tenures: ClientTenure[] = clients.map(c => {
        // Use training_start_date if available, otherwise fall back to created_at
        const startDate = c.training_start_date 
          ? new Date(c.training_start_date) 
          : new Date(c.created_at);
        const months = differenceInMonths(now, startDate);
        return { 
          id: c.id, 
          name: c.name, 
          months: Math.max(0, months),
          firstTraining: c.training_start_date ? new Date(c.training_start_date) : null
        };
      });

      // Bucket distribution
      const buckets: TenureBucket[] = [
        { label: '< 3 měsíce', count: 0, color: 'bg-primary' },
        { label: '3-6 měsíců', count: 0, color: 'bg-blue-500' },
        { label: '6-12 měsíců', count: 0, color: 'bg-success' },
        { label: '1-2 roky', count: 0, color: 'bg-warning' },
        { label: '2+ roky', count: 0, color: 'bg-destructive' },
      ];

      tenures.forEach(t => {
        if (t.months < 3) buckets[0].count++;
        else if (t.months < 6) buckets[1].count++;
        else if (t.months < 12) buckets[2].count++;
        else if (t.months < 24) buckets[3].count++;
        else buckets[4].count++;
      });

      // Calculate average
      const avgMonths = tenures.length > 0 
        ? tenures.reduce((sum, t) => sum + t.months, 0) / tenures.length 
        : 0;

      // Get longest clients (sorted by months descending)
      const longestClients = [...tenures]
        .sort((a, b) => b.months - a.months)
        .slice(0, 5);

      return { 
        buckets, 
        avgMonths: Math.round(avgMonths * 10) / 10, 
        totalClients: tenures.length,
        longestClients
      };
    },
  });

  // Format tenure display
  const formatTenure = (months: number): string => {
    if (months < 1) return '< 1 měsíc';
    if (months < 12) return `${months} měs.`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return years === 1 ? '1 rok' : `${years} roky`;
    }
    return `${years}r ${remainingMonths}m`;
  };

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
          <p className="text-2xl font-bold">{formatTenure(Math.round(data?.avgMonths || 0))}</p>
          <p className="text-xs text-muted-foreground">průměrná délka</p>
        </div>

        {/* Distribution bars */}
        <div className="space-y-2">
          {buckets.filter(b => b.count > 0).map((bucket) => {
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

        {/* Longest clients with exact tenure */}
        {data?.longestClients && data.longestClients.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Nejdéle spolupracují</p>
            <div className="space-y-1">
              {data.longestClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{client.name}</span>
                  <span className="text-muted-foreground ml-2 font-medium">
                    {formatTenure(client.months)}
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
