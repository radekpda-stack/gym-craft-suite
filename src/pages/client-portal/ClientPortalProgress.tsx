import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { TrendingUp } from 'lucide-react';

export default function ClientPortalProgress() {
  const { clientProfile } = useClientPortal();
  const { trackPageMount } = useClientPortalPageTracking('client_portal_progress');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pokrok</h1>
        <p className="text-muted-foreground">Sleduj své zlepšení</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Síla - Top cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Tvůj trenér zatím neoznačil žádné cviky ke sledování.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
