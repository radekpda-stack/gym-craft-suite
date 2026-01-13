import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBulkCreateClientPortals } from '@/hooks/useClientPortalBulkCreate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function BulkCreatePortalsButton() {
  const { user } = useAuth();
  const [clientsWithoutPortal, setClientsWithoutPortal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const bulkCreate = useBulkCreateClientPortals();

  // Fetch count of clients without portal
  useEffect(() => {
    const fetchCount = async () => {
      if (!user?.id) return;
      
      try {
        // Get all non-archived, non-system clients
        const { data: allClients, error: clientsError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .eq('is_system', false);

        if (clientsError) throw clientsError;

        // Get clients with portal
        const { data: portalClients, error: portalError } = await supabase
          .from('client_accounts')
          .select('client_id')
          .eq('trainer_id', user.id);

        if (portalError) throw portalError;

        const portalClientIds = new Set(portalClients?.map(p => p.client_id) || []);
        const withoutPortal = allClients?.filter(c => !portalClientIds.has(c.id)).length || 0;
        
        setClientsWithoutPortal(withoutPortal);
      } catch (error) {
        console.error('Error fetching clients without portal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();
  }, [user?.id, bulkCreate.isSuccess]);

  const handleBulkCreate = async () => {
    setDialogOpen(false);
    await bulkCreate.mutateAsync();
    
    // Refresh count after creation
    setClientsWithoutPortal(0);
  };

  if (isLoading) {
    return null;
  }

  if (clientsWithoutPortal === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {clientsWithoutPortal} {clientsWithoutPortal === 1 ? 'klient nemá' : 'klientů nemá'} portálový účet
                </p>
                <p className="text-sm text-muted-foreground">
                  Vytvořte jim přístup jedním kliknutím
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              disabled={bulkCreate.isPending}
              className="shrink-0"
            >
              {bulkCreate.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vytvářím...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Vytvořit portály
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vytvořit portálové účty</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Tato akce vytvoří portálový účet pro <strong>{clientsWithoutPortal} klientů</strong>.
              </p>
              <div className="bg-muted rounded-lg p-3 text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <span>Klienti s emailem dostanou email jako přihlašovací jméno</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <span>Klienti bez emailu dostanou automaticky generované přihlašovací jméno</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <span>Hesla můžete resetovat individuálně v seznamu klientů</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkCreate}>
              <Users className="w-4 h-4 mr-2" />
              Vytvořit {clientsWithoutPortal} účtů
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
