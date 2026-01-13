import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Check, X, Clock, User, Dumbbell, Edit2, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingPerformances, useApprovePerformance } from '@/hooks/usePerformanceLog';
import { formatTimeMs, parseTimeToMs } from '@/lib/timeUtils';

export function PendingPerformancesCard() {
  const { data: pendingPerformances, isLoading } = usePendingPerformances();
  const approvePerformance = useApprovePerformance();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimeInput, setEditTimeInput] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Čekající na schválení
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingPerformances?.length) {
    return null; // Don't show card if no pending items
  }

  const handleApprove = async (id: string, updates?: { time_ms?: number; weight_kg?: number; reps?: number }) => {
    await approvePerformance.mutateAsync({
      id,
      status: 'approved',
      updates,
    });
    setEditingId(null);
  };

  const handleReject = async (id: string) => {
    await approvePerformance.mutateAsync({
      id,
      status: 'rejected',
    });
  };

  const openEditDialog = (performance: any) => {
    setEditingId(performance.id);
    if (performance.time_ms) {
      setEditTimeInput(formatTimeMs(performance.time_ms));
    } else if (performance.time_seconds) {
      setEditTimeInput(formatTimeMs(performance.time_seconds * 1000));
    }
    setEditWeight(performance.weight_kg?.toString() || '');
    setEditReps(performance.reps?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    const updates: { time_ms?: number; weight_kg?: number; reps?: number } = {};
    
    if (editTimeInput) {
      const timeMs = parseTimeToMs(editTimeInput);
      if (timeMs) updates.time_ms = timeMs;
    }
    if (editWeight) {
      updates.weight_kg = parseFloat(editWeight.replace(',', '.'));
    }
    if (editReps) {
      updates.reps = parseInt(editReps);
    }
    
    await handleApprove(editingId, Object.keys(updates).length > 0 ? updates : undefined);
  };

  const editingPerformance = pendingPerformances?.find(p => p.id === editingId);

  return (
    <>
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-warning" />
            Čekající na schválení
            <Badge variant="secondary" className="ml-auto">
              {pendingPerformances.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Výkony nahlášené klienty čekají na vaše schválení
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingPerformances.map((performance: any) => (
            <div
              key={performance.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-background border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">
                    {performance.clients?.name || 'Neznámý'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Dumbbell className="h-3 w-3" />
                  <span className="truncate">{performance.exercise_name}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  {(performance.time_ms || performance.time_seconds) && (
                    <span className="font-mono font-medium">
                      <Timer className="h-3 w-3 inline mr-1" />
                      {formatTimeMs(performance.time_ms || performance.time_seconds * 1000)}
                    </span>
                  )}
                  {performance.weight_kg && (
                    <span>{performance.weight_kg} kg</span>
                  )}
                  {performance.reps && (
                    <span>{performance.reps} rep</span>
                  )}
                  <span className="text-muted-foreground">
                    {format(new Date(performance.date), 'd. MMM', { locale: cs })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => openEditDialog(performance)}
                  title="Upravit a schválit"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                  onClick={() => handleApprove(performance.id)}
                  disabled={approvePerformance.isPending}
                  title="Schválit"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleReject(performance.id)}
                  disabled={approvePerformance.isPending}
                  title="Zamítnout"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit a schválit výkon</DialogTitle>
            <DialogDescription>
              Upravte hodnoty pokud je potřeba a pak schvalte.
            </DialogDescription>
          </DialogHeader>
          
          {editingPerformance && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{editingPerformance.clients?.name}</p>
                <p className="text-sm text-muted-foreground">{editingPerformance.exercise_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(editingPerformance.date), 'd. MMMM yyyy', { locale: cs })}
                </p>
              </div>

              <div className="grid gap-4">
                {(editingPerformance.time_ms || editingPerformance.time_seconds) && (
                  <div className="space-y-2">
                    <Label>Čas (mm:ss.SS)</Label>
                    <Input
                      value={editTimeInput}
                      onChange={(e) => setEditTimeInput(e.target.value)}
                      placeholder="1:41.35"
                    />
                  </div>
                )}
                
                {editingPerformance.weight_kg !== null && (
                  <div className="space-y-2">
                    <Label>Váha (kg)</Label>
                    <Input
                      type="text"
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      placeholder="80"
                    />
                  </div>
                )}
                
                {editingPerformance.reps !== null && (
                  <div className="space-y-2">
                    <Label>Opakování</Label>
                    <Input
                      type="number"
                      value={editReps}
                      onChange={(e) => setEditReps(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Zrušit
            </Button>
            <Button onClick={handleSaveEdit} disabled={approvePerformance.isPending}>
              {approvePerformance.isPending ? 'Ukládám...' : 'Schválit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
