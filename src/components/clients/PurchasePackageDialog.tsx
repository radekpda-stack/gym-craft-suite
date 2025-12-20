import { useState } from 'react';
import { Package, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTrainingPackages } from '@/hooks/useTrainingPackages';
import { usePurchasePackage } from '@/hooks/useClientPackages';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PurchasePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function PurchasePackageDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: PurchasePackageDialogProps) {
  const { data: packages, isLoading } = useTrainingPackages();
  const purchasePackage = usePurchasePackage();

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTrainings, setCustomTrainings] = useState('10');
  const [customPrice, setCustomPrice] = useState('');
  const [customValidity, setCustomValidity] = useState('');
  const [notes, setNotes] = useState('');

  const activePackages = (packages || []).filter(p => p.is_active);
  const selectedPackage = activePackages.find(p => p.id === selectedPackageId);

  const handlePurchase = async () => {
    if (customMode) {
      if (!customName || !customTrainings || !customPrice) return;
      
      await purchasePackage.mutateAsync({
        client_id: clientId,
        package_name: customName,
        trainings_total: parseInt(customTrainings),
        price_paid: parseFloat(customPrice),
        validity_days: customValidity ? parseInt(customValidity) : undefined,
        notes: notes || undefined,
      });
    } else {
      if (!selectedPackage) return;
      
      await purchasePackage.mutateAsync({
        client_id: clientId,
        package_id: selectedPackage.id,
        package_name: selectedPackage.name,
        trainings_total: selectedPackage.training_count,
        price_paid: selectedPackage.price,
        validity_days: selectedPackage.validity_days || undefined,
        notes: notes || undefined,
      });
    }

    // Reset and close
    setSelectedPackageId(null);
    setCustomMode(false);
    setCustomName('');
    setCustomTrainings('10');
    setCustomPrice('');
    setCustomValidity('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Přiřadit balíček - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Package selection */}
          {!customMode && (
            <>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : activePackages.length > 0 ? (
                <div className="space-y-2">
                  <Label>Vyberte balíček</Label>
                  <div className="grid gap-2">
                    {activePackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-all',
                          selectedPackageId === pkg.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {pkg.training_count} tréninků
                              {pkg.validity_days && ` • ${pkg.validity_days} dní platnost`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{pkg.price} Kč</span>
                            {selectedPackageId === pkg.id && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Žádné balíčky. Vytvořte je v Nastavení nebo zadejte vlastní.</p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setCustomMode(true)}
              >
                Zadat vlastní balíček
              </Button>
            </>
          )}

          {/* Custom package form */}
          {customMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Vlastní balíček</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomMode(false)}
                >
                  Zpět na výběr
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-name">Název</Label>
                <Input
                  id="custom-name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="např. Balíček 10 tréninků"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="custom-trainings">Počet tréninků</Label>
                  <Input
                    id="custom-trainings"
                    type="number"
                    value={customTrainings}
                    onChange={(e) => setCustomTrainings(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-price">Cena (Kč)</Label>
                  <Input
                    id="custom-price"
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-validity">Platnost (dní, volitelné)</Label>
                <Input
                  id="custom-validity"
                  type="number"
                  value={customValidity}
                  onChange={(e) => setCustomValidity(e.target.value)}
                  placeholder="bez omezení"
                  min="1"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Poznámka (volitelné)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interní poznámka..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button
              className="flex-1"
              onClick={handlePurchase}
              disabled={
                purchasePackage.isPending ||
                (customMode ? !customName || !customTrainings || !customPrice : !selectedPackageId)
              }
            >
              {purchasePackage.isPending ? 'Ukládám...' : 'Přiřadit balíček'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
