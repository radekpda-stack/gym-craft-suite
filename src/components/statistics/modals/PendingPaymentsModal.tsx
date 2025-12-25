import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, User, Users, CreditCard, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { usePendingPayments } from '@/hooks/useCreditOperations';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingPaymentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData | undefined;
}

export function PendingPaymentsModal({ open, onOpenChange, stats }: PendingPaymentsModalProps) {
  const navigate = useNavigate();
  const { data: pendingData, isLoading } = usePendingPayments();
  
  if (!stats) return null;

  const handleClientClick = (clientId: string) => {
    onOpenChange(false);
    navigate(`/clients/${clientId}`);
  };

  const individualDebtors = pendingData?.individual || [];
  const groupDebtors = pendingData?.groups || [];
  const totalIndividual = pendingData?.total_individual_amount || 0;
  const totalGroup = pendingData?.total_group_amount || 0;
  const totalAmount = totalIndividual + totalGroup;
  const totalCount = individualDebtors.length + groupDebtors.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            K zaplacení - přehled
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              {/* Main value */}
              <div className="text-center py-4 bg-destructive/5 rounded-xl">
                <p className="text-4xl font-bold text-destructive">
                  {formatCurrency(totalAmount)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  celkem k zaplacení
                </p>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <User className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{individualDebtors.length}</p>
                  <p className="text-xs text-muted-foreground">individuálních</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{groupDebtors.length}</p>
                  <p className="text-xs text-muted-foreground">skupin</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <CreditCard className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">
                    {totalCount > 0 ? formatCurrency(totalAmount / totalCount) : formatCurrency(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">průměr</p>
                </div>
              </div>

              {/* Individual debtors */}
              {individualDebtors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Individuální klienti</h4>
                    <Badge variant="destructive" className="ml-auto">
                      {formatCurrency(totalIndividual)}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {individualDebtors.map((client) => (
                      <Button
                        key={client.id}
                        variant="ghost"
                        className="w-full justify-between h-auto p-3 hover:bg-destructive/5"
                        onClick={() => handleClientClick(client.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-destructive" />
                          </div>
                          <span className="font-medium">{client.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-destructive">
                            {formatCurrency(Math.abs(client.credit_balance))}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Group debtors */}
              {groupDebtors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Skupiny se sdíleným budgetem</h4>
                    <Badge variant="destructive" className="ml-auto">
                      {formatCurrency(totalGroup)}
                    </Badge>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {groupDebtors.map((group) => (
                      <div
                        key={group.id}
                        className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-destructive" />
                            <span className="font-medium">{group.name}</span>
                          </div>
                          <span className="font-bold text-destructive">
                            {formatCurrency(Math.abs(group.shared_balance))}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.members?.map((member) => (
                            <Button
                              key={member.id}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs hover:bg-destructive/10"
                              onClick={() => handleClientClick(member.id)}
                            >
                              {member.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No debtors */}
              {individualDebtors.length === 0 && groupDebtors.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Žádné nezaplacené platby</p>
                  <p className="text-xs mt-1">Všichni klienti i skupiny mají vyrovnaný kredit.</p>
                </div>
              )}

              {/* Info text */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Individuální dlužníci:</strong> Klienti se záporným osobním kreditem, kteří nejsou součástí žádné skupiny.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Skupiny:</strong> Sdílené rozpočty se záporným zůstatkem. Dluh patří celé skupině, ne jednotlivým členům.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
