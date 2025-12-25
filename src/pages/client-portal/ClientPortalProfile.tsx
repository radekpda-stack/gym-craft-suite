import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { User, Mail, Phone, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientPortalProfile() {
  const { clientProfile, signOut } = useClientPortal();
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_profile');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  const handleSignOut = async () => {
    trackPortalEvent('client_portal_logout');
    await signOut();
    toast.success('Odhlášení proběhlo úspěšně');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-muted-foreground">Vaše údaje</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            Osobní údaje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {clientProfile?.name?.charAt(0) ?? 'K'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{clientProfile?.name}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            {clientProfile?.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{clientProfile.email}</span>
              </div>
            )}
            {clientProfile?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{clientProfile.phone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
        <LogOut className="w-4 h-4" />
        Odhlásit se
      </Button>
    </div>
  );
}
