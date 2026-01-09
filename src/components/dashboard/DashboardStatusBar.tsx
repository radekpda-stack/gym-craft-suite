import { useState } from 'react';
import { 
  Plus, 
  Search,
  Wallet,
  Clock,
  Users,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { STATUS_CONFIG, Status } from '@/lib/statusUtils';
import { useUnpaidTrainings, usePayTraining } from '@/hooks/useUnpaidTrainings';
import { PaymentMethodSelector, PaymentOption, getPaymentMethodFromOption } from '@/components/trainings/PaymentMethodSelector';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardStatusBarProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

// Map DayStatus to unified Status type
const dayStatusToStatus: Record<DayStatus, Status> = {
  ok: 'ok',
  warning: 'warning',
  critical: 'error',
};

function StatusIndicator({ status }: { status: DayStatus }) {
  const unifiedStatus = dayStatusToStatus[status];
  const config = STATUS_CONFIG[unifiedStatus];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium shrink-0',
      config.bgClassStrong,
      config.textClass
    )}>
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{config.labelShort}</span>
    </div>
  );
}

interface MetricChipProps {
  icon: typeof Wallet;
  label: string;
  value: string | number;
  subValue?: string;
  warning?: boolean;
  error?: boolean;
  onClick?: () => void;
}

function MetricChip({ icon: Icon, label, value, subValue, warning, error, onClick }: MetricChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 h-9 px-3 rounded-full text-sm transition-colors shrink-0',
        'bg-secondary/50 hover:bg-secondary',
        error && 'ring-1 ring-status-error/30',
        warning && !error && 'ring-1 ring-status-warning/30'
      )}
    >
      <Icon className={cn(
        'w-4 h-4 shrink-0',
        error ? 'text-status-error' : warning ? 'text-status-warning' : 'text-muted-foreground'
      )} />
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{value}</span>
        {subValue && (
          <span className={cn(
            'text-xs',
            error ? 'text-status-error' : warning ? 'text-status-warning' : 'text-muted-foreground'
          )}>
            {subValue}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    </button>
  );
}

export function DashboardStatusBar({ data, isLoading }: DashboardStatusBarProps) {
  const { trackFeature } = useFeatureTracking();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  const { data: unpaidTrainings = [] } = useUnpaidTrainings();
  const payTraining = usePayTraining();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUnpaidDialog, setShowUnpaidDialog] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('credit');

  const selectedTraining = unpaidTrainings.find(t => t.id === selectedTrainingId);

  const handlePayTraining = async () => {
    if (!selectedTrainingId) return;
    
    await payTraining.mutateAsync({
      trainingId: selectedTrainingId,
      paymentMethod: getPaymentMethodFromOption(paymentMethod),
      deductCredit: paymentMethod === 'credit',
    });
    
    setSelectedTrainingId(null);
    setPaymentMethod('credit');
  };
  
  const handleCreateTraining = async (formData: any) => {
    try {
      await createTraining.mutateAsync(formData);
      setShowTrainingSheet(false);
      trackFeature('create_training', 'trainings');
      toast({ title: 'Trénink vytvořen' });
    } catch (error) {
      console.error('Error creating training:', error);
      toast({ title: 'Chyba při vytváření tréninku', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dayStatus, capacity, finance, todayEstimatedIncome, uniqueClientsToday } = data;

  return (
    <>
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Day Status Indicator */}
          <StatusIndicator status={dayStatus} />
          
          {/* Capacity */}
          <MetricChip
            icon={Users}
            label="Dnes tréninků"
            value={`${capacity.completed}/${capacity.total}`}
            subValue={uniqueClientsToday > 1 ? `(${uniqueClientsToday} klientů)` : undefined}
          />
          
          {/* Estimated Income Today */}
          {todayEstimatedIncome > 0 && (
            <MetricChip
              icon={Banknote}
              label="Příjem dnes"
              value={formatCurrency(todayEstimatedIncome)}
            />
          )}
          
          {/* Unpaid */}
          {finance.unpaidTotal.count > 0 && (
            <MetricChip
              icon={Clock}
              label="Nezaplaceno"
              value={finance.unpaidTotal.count}
              subValue={formatCurrency(finance.unpaidTotal.amount)}
              warning={finance.unpaidTotal.count > 0 && finance.unpaidTotal.count <= 3}
              error={finance.unpaidTotal.count > 3}
              onClick={() => setShowUnpaidDialog(true)}
            />
          )}
          
          {/* Low Credit */}
          {finance.creditAtRisk.count > 0 && (
            <MetricChip
              icon={Wallet}
              label="Nízký kredit"
              value={finance.creditAtRisk.count}
              warning
              onClick={() => setShowCreditDialog(true)}
            />
          )}
          
          <div className="flex-1" />
          
          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="gap-2 shrink-0 h-9 rounded-full"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Hledat</span>
          </Button>
          
          <Button
            size="sm"
            onClick={() => setShowTrainingSheet(true)}
            className="gap-2 shrink-0 h-9 rounded-full"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nový trénink</span>
            <span className="sm:hidden">Nový</span>
          </Button>
        </div>
      </div>
      
      {/* Dialogs */}
      <CreateTrainingSheet
        open={showTrainingSheet}
        onOpenChange={setShowTrainingSheet}
        onSubmit={handleCreateTraining}
        clients={clients}
        isLoading={createTraining.isPending}
      />
      
      <CommandPalette 
        open={showSearch} 
        onOpenChange={setShowSearch} 
      />
      
      {/* Unpaid Detail Dialog */}
      <Dialog open={showUnpaidDialog} onOpenChange={(open) => {
        setShowUnpaidDialog(open);
        if (!open) {
          setSelectedTrainingId(null);
          setPaymentMethod('credit');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-status-warning" />
              Nezaplacené tréninky
            </DialogTitle>
          </DialogHeader>
          
          {selectedTrainingId && selectedTraining ? (
            // Payment view
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-secondary/50 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{selectedTraining.client_name}</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(selectedTraining.final_price || 0)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedTraining.date), 'd. MMMM yyyy', { locale: cs })}
                </p>
              </div>
              
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={payTraining.isPending}
              />

              {paymentMethod === 'credit' && (
                <p className="text-sm text-muted-foreground text-center">
                  Částka bude odečtena z kreditu klienta
                </p>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedTrainingId(null);
                    setPaymentMethod('credit');
                  }}
                >
                  Zpět
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handlePayTraining}
                  disabled={payTraining.isPending}
                >
                  {payTraining.isPending ? 'Ukládám...' : 'Potvrdit platbu'}
                </Button>
              </div>
            </div>
          ) : (
            // List view
            <div className="space-y-4 py-2">
              <div className="text-center pb-2 border-b">
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(finance.unpaidTotal.amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {finance.unpaidTotal.count} nezaplacených tréninků
                </p>
              </div>
              
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {unpaidTrainings.map((training) => (
                    <div
                      key={training.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border hover:bg-secondary/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{training.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(training.date), 'd. MMMM yyyy', { locale: cs })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-status-warning">
                          {formatCurrency(training.final_price || 0)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setSelectedTrainingId(training.id)}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Uhradit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Credit Detail Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[hsl(38_92%_50%)]" />
              Klienti s nízkým kreditem
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {finance.creditAtRisk.count}
            </p>
            <p className="text-muted-foreground mt-1">
              klientů potřebuje doplnit kredit
            </p>
            <Button 
              className="mt-4" 
              onClick={() => {
                setShowCreditDialog(false);
                window.location.href = '/clients?filter=lowcredit';
              }}
            >
              Zobrazit klienty
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
