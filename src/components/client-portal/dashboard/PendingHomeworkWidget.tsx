import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientAssignedWorkouts } from '@/hooks/useAssignedWorkouts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function PendingHomeworkWidget() {
  const { clientId } = useClientPortal();
  const { data: workouts } = useClientAssignedWorkouts(clientId ?? undefined);
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';

  const pending = workouts?.filter(w => w.status === 'pending' || w.status === 'in_progress') ?? [];

  if (pending.length === 0) return null;

  return (
    <Link to={`${basePath}/homework`}>
      <Card className="bg-accent/5 border-accent/20 hover:bg-accent/10 transition-colors cursor-pointer">
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Domácí tréninky</p>
              <p className="text-xs text-muted-foreground">
                {pending.length} {pending.length === 1 ? 'úkol čeká na splnění' : pending.length < 5 ? 'úkoly čekají na splnění' : 'úkolů čeká na splnění'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
