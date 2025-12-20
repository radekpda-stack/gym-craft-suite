import { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  useTrainingPackages,
  useCreateTrainingPackage,
  useUpdateTrainingPackage,
  useDeleteTrainingPackage,
  TrainingPackage,
} from '@/hooks/useTrainingPackages';
import { cn } from '@/lib/utils';

export function PackagesManagement() {
  const { data: packages, isLoading } = useTrainingPackages();
  const createPackage = useCreateTrainingPackage();
  const updatePackage = useUpdateTrainingPackage();
  const deletePackage = useDeleteTrainingPackage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TrainingPackage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trainingCount, setTrainingCount] = useState('10');
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTrainingCount('10');
    setPrice('');
    setValidityDays('');
    setIsActive(true);
    setEditingPackage(null);
  };

  const openEditDialog = (pkg: TrainingPackage) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setDescription(pkg.description || '');
    setTrainingCount(pkg.training_count.toString());
    setPrice(pkg.price.toString());
    setValidityDays(pkg.validity_days?.toString() || '');
    setIsActive(pkg.is_active);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name || !trainingCount || !price) return;

    if (editingPackage) {
      await updatePackage.mutateAsync({
        id: editingPackage.id,
        name,
        description: description || null,
        training_count: parseInt(trainingCount),
        price: parseFloat(price),
        validity_days: validityDays ? parseInt(validityDays) : null,
        is_active: isActive,
      });
    } else {
      await createPackage.mutateAsync({
        name,
        description: description || undefined,
        training_count: parseInt(trainingCount),
        price: parseFloat(price),
        validity_days: validityDays ? parseInt(validityDays) : undefined,
      });
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deletePackage.mutateAsync(deletingId);
    setDeletingId(null);
    setDeleteDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
        <Plus className="w-4 h-4 mr-2" />
        Přidat balíček
      </Button>

      {/* Packages list */}
      {packages && packages.length > 0 ? (
        <div className="space-y-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                'p-4 rounded-xl border transition-colors',
                pkg.is_active ? 'bg-card border-border' : 'bg-secondary/30 border-border/50 opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn(
                    'p-2 rounded-lg',
                    pkg.is_active ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                  )}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{pkg.name}</h4>
                      {!pkg.is_active && (
                        <Badge variant="secondary" className="text-xs">Neaktivní</Badge>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-secondary/50">
                        {pkg.training_count} tréninků
                      </span>
                      <span className="px-2 py-0.5 rounded bg-secondary/50">
                        {pkg.price} Kč
                      </span>
                      {pkg.validity_days && (
                        <span className="px-2 py-0.5 rounded bg-secondary/50">
                          {pkg.validity_days} dní platnost
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(pkg)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setDeletingId(pkg.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Zatím nemáte žádné balíčky</p>
          <p className="text-sm mt-1">Vytvořte první balíček pro své klienty</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Upravit balíček' : 'Nový balíček'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pkg-name">Název *</Label>
              <Input
                id="pkg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. Balíček 10 tréninků"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pkg-desc">Popis</Label>
              <Textarea
                id="pkg-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Volitelný popis balíčku..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pkg-count">Počet tréninků *</Label>
                <Input
                  id="pkg-count"
                  type="number"
                  value={trainingCount}
                  onChange={(e) => setTrainingCount(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-price">Cena (Kč) *</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pkg-validity">Platnost (dní)</Label>
              <Input
                id="pkg-validity"
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                placeholder="bez omezení"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Ponechte prázdné pro neomezenou platnost
              </p>
            </div>

            {editingPackage && (
              <div className="flex items-center justify-between">
                <Label htmlFor="pkg-active">Aktivní balíček</Label>
                <Switch
                  id="pkg-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
              >
                Zrušit
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={!name || !trainingCount || !price || createPackage.isPending || updatePackage.isPending}
              >
                {editingPackage ? 'Uložit' : 'Vytvořit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat balíček?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Balíček bude trvale smazán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
