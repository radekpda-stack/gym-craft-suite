import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet,
  CheckCircle2,
  ChevronRight,
  Clock,
  Banknote,
  CreditCard,
  Building2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PendingPaymentSession {
  id: string;
  date: string;
  final_price: number | null;
  client_id: string;
  clientName: string;
  participant_count: number;
  daysAgo: number;
}

const paymentMethods = [
  { value: 'credit', label: 'Kredit', icon: Wallet },
  { value: 'cash', label: 'Hotovost', icon: Banknote },
  { value: 'card', label: 'Karta', icon: CreditCard },
  { value: 'bank', label: 'Převod', icon: Building2 },
] as const;

type PaymentMethodType = 'credit' | 'cash' | 'card' | 'bank';

export function PendingPaymentsCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: pendingSessions = [], isLoading } = useQuery({
    queryKey: ['pending-payment-sessions'],
    queryFn: async (): Promise<PendingPaymentSession[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, date, final_price, client_id, participant_count, clients(name)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('payment_status', 'pending')
        .order('date', { ascending: false })
        .limit(20);

      if (error) throw error;

      const now = new Date();
      return (data || []).map(s => ({
        id: s.id,
        date: s.date,
        final_price: s.final_price,
        client_id: s.client_id,
        clientName: (s.clients as any)?.name || 'Neznámý',
        participant_count: s.participant_count || 1,
        daysAgo: differenceInDays(now, new Date(s.date)),
      }));
    },
    staleTime: 60000,
  });
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PendingPaymentSession | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('credit');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalPending = pendingSessions.reduce((sum, s) => sum + (s.final_price || 0), 0);

  const handleOpenPayment = (session: PendingPaymentSession) => {
    setSelectedSession(session);
    setPaymentMethod('credit');
    setPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedSession) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({ 
          payment_status: `paid_${paymentMethod}`,
          payment_method: paymentMethod,
        })
        .eq('id', selectedSession.id);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['pending-payment-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-core'] });

      toast({ 
        title: 'Platba zaznamenána',
        description: `Trénink ${selectedSession.clientName} označen jako zaplacený`,
      });
      setPaymentDialogOpen(false);
      setSelectedSession(null);
    } catch (error) {
      toast({ title: 'Chyba při ukládání', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingSessions.length === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Čeká na platbu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-success" />
            <p className="text-sm font-medium text-foreground">Vše zaplaceno!</p>
            <p className="text-xs text-muted-foreground mt-1">Žádné tréninky nečekají na platbu</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-warning" />
            Čeká na platbu
            <Badge variant="secondary" className="ml-auto bg-warning/20 text-warning border-warning/30">
              {pendingSessions.length}× · {formatCurrency(totalPending)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingSessions.slice(0, 5).map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
            >
              <button
                onClick={() => navigate(`/trainings/${session.id}`)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{session.clientName}</p>
                  {session.participant_count > 1 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                      <Users className="w-2.5 h-2.5" />
                      {session.participant_count}×
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-warning font-semibold">
                    {session.final_price ? formatCurrency(session.final_price) : '—'}
                  </span>
                  <span className="text-muted-foreground">
                    · {format(new Date(session.date), 'd. M.', { locale: cs })}
                    {session.daysAgo > 0 && (
                      <span className="text-muted-foreground/60"> ({session.daysAgo} d)</span>
                    )}
                  </span>
                </div>
              </button>
              
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity border-warning/40 text-warning hover:bg-warning/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPayment(session);
                }}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Zaplatit</span>
              </Button>
              
              <button
                onClick={() => navigate(`/trainings/${session.id}`)}
                className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors shrink-0"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}

          {pendingSessions.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => navigate('/calendar')}
            >
              Zobrazit všech {pendingSessions.length} tréninků
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quick Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Zaznamenat platbu
            </DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="font-medium">{selectedSession.clientName}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedSession.date), 'd. MMMM yyyy', { locale: cs })}
                </p>
                <p className="text-lg font-bold text-warning mt-1">
                  {selectedSession.final_price ? formatCurrency(selectedSession.final_price) : 'Cena nestanovena'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Způsob platby</p>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border-2 transition-all',
                          paymentMethod === method.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <Icon className={cn(
                          'w-4 h-4',
                          paymentMethod === method.value ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className={cn(
                          'text-sm font-medium',
                          paymentMethod === method.value ? 'text-primary' : 'text-muted-foreground'
                        )}>
                          {method.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing}>
              {isProcessing ? 'Ukládám...' : 'Označit jako zaplaceno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
