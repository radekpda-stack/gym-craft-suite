import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrainerStatsShowcase } from '@/components/public-stats/TrainerStatsShowcase';
import { Loader2 } from 'lucide-react';

export default function PublicTrainerStats() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-trainer-stats', slug],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-trainer-stats?slug=${encodeURIComponent(slug!)}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Vizitka nenalezena');
      }

      return res.json();
    },
    enabled: !!slug,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Vizitka nenalezena</h1>
          <p className="text-muted-foreground">Tento trenér nemá aktivní veřejnou vizitku.</p>
        </div>
      </div>
    );
  }

  return <TrainerStatsShowcase data={data} />;
}
