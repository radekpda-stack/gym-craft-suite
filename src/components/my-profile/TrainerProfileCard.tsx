import { Card, CardContent } from '@/components/ui/card';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainerProfileCardProps {
  clientId: string;
}

export function TrainerProfileCard({ clientId }: TrainerProfileCardProps) {
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['trainer-client-data', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('created_at')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isLoading = profileLoading || clientLoading;

  if (isLoading) {
    return <Skeleton className="h-28" />;
  }

  if (!profile) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{profile.clientName}</h2>
            <p className="text-sm text-muted-foreground">Osobní trenér</p>
            {clientData?.created_at && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Aktivní od {format(new Date(clientData.created_at), 'LLLL yyyy', { locale: cs })}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
