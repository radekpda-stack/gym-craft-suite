import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { differenceInYears } from 'date-fns';

interface ClientAge {
  id: string;
  name: string;
  age: number;
}

export function ClientAgeCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-age-stats'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Get all active clients with birth_date
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, birth_date')
        .eq('user_id', user.user.id)
        .eq('is_archived', false)
        .not('birth_date', 'is', null);

      if (!clients || clients.length === 0) return null;

      const now = new Date();
      
      // Calculate age for each client
      const ages: ClientAge[] = clients
        .filter(c => c.birth_date)
        .map(c => {
          const birthDate = new Date(c.birth_date!);
          // Skip invalid dates (like 2025-12-05 which is a future date or data entry error)
          if (birthDate > now || differenceInYears(now, birthDate) > 120) {
            return null;
          }
          const age = differenceInYears(now, birthDate);
          return { id: c.id, name: c.name, age };
        })
        .filter((c): c is ClientAge => c !== null && c.age >= 0 && c.age <= 120);

      if (ages.length === 0) return null;

      // Sort by age
      const sortedByAge = [...ages].sort((a, b) => a.age - b.age);
      
      const youngest = sortedByAge[0];
      const oldest = sortedByAge[sortedByAge.length - 1];
      
      // Calculate average age
      const avgAge = ages.reduce((sum, c) => sum + c.age, 0) / ages.length;

      // Age distribution buckets
      const ageBuckets = [
        { label: '18-30 let', count: ages.filter(a => a.age >= 18 && a.age < 30).length, color: 'bg-primary' },
        { label: '30-40 let', count: ages.filter(a => a.age >= 30 && a.age < 40).length, color: 'bg-success' },
        { label: '40-50 let', count: ages.filter(a => a.age >= 40 && a.age < 50).length, color: 'bg-warning' },
        { label: '50+ let', count: ages.filter(a => a.age >= 50).length, color: 'bg-destructive' },
      ].filter(b => b.count > 0);

      return { 
        youngest,
        oldest,
        avgAge: Math.round(avgAge),
        totalWithAge: ages.length,
        ageBuckets
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

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            Věk klientů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Žádní klienti s vyplněným datem narození
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          Věk klientů
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average age */}
        <div className="text-center p-3 rounded-lg bg-primary/10">
          <p className="text-2xl font-bold">{data.avgAge} let</p>
          <p className="text-xs text-muted-foreground">průměrný věk ({data.totalWithAge} klientů)</p>
        </div>

        {/* Youngest and oldest */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-xs text-muted-foreground mb-1">Nejmladší</p>
            <p className="font-bold text-success">{data.youngest.age} let</p>
            <p className="text-xs text-muted-foreground truncate">{data.youngest.name}</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-center">
            <p className="text-xs text-muted-foreground mb-1">Nejstarší</p>
            <p className="font-bold text-warning">{data.oldest.age} let</p>
            <p className="text-xs text-muted-foreground truncate">{data.oldest.name}</p>
          </div>
        </div>

        {/* Age distribution */}
        {data.ageBuckets.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">Rozložení věku</p>
            {data.ageBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{bucket.label}</span>
                <span className="font-medium">{bucket.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}