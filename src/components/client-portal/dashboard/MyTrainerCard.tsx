import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

function useTrainerProfile(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['trainer-profile', trainerId],
    enabled: !!trainerId,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!trainerId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, phone, avatar_url')
        .eq('id', trainerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function MyTrainerCard() {
  const { clientAccount } = useClientPortal();
  const { data: trainer, isLoading } = useTrainerProfile(clientAccount?.trainer_id);
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';

  if (isLoading || !trainer?.display_name) return null;

  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {trainer.avatar_url ? (
              <img src={trainer.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Můj trenér</p>
            <p className="text-sm font-medium truncate">{trainer.display_name}</p>
          </div>
        </div>
        <Link to={`${basePath}/chat`}>
          <Button size="sm" variant="ghost" className="shrink-0">
            <MessageCircle className="w-4 h-4 mr-1.5" />
            Chat
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
