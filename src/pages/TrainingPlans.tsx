import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Target, Calendar, MoreVertical, Trash2, Edit, Copy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useTrainingPlans, GOAL_OPTIONS, PHASE_OPTIONS } from '@/hooks/useTrainingPlans';
import { useClients } from '@/hooks/useClients';
import { CreatePlanDialog } from '@/components/plans/CreatePlanDialog';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking, useFeatureTracking } from '@/hooks/useFeatureTracking';

export default function TrainingPlans() {
  usePageTracking('training_plans');
  const navigate = useNavigate();
  const { plans, isLoading, deletePlan } = useTrainingPlans();
  const { data: clients = [] } = useClients();
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredPlans = plans.filter((plan) => {
    const client = clients.find((c) => c.id === plan.client_id);
    const searchLower = search.toLowerCase();
    return (
      plan.name.toLowerCase().includes(searchLower) ||
      client?.name.toLowerCase().includes(searchLower)
    );
  });

  const getGoalLabel = (value: string) => GOAL_OPTIONS.find((o) => o.value === value)?.label || value;
  const getPhaseLabel = (value: string) => PHASE_OPTIONS.find((o) => o.value === value)?.label || value;

  const handleDelete = () => {
    if (deleteId) {
      deletePlan.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tréninkové plány</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vytvářejte a spravujte tréninkové programy pro klienty
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nový plán
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Hledat plány..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Žádné plány</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'Žádné plány neodpovídají hledání' : 'Vytvořte první tréninkový plán'}
            </p>
            {!search && (
              <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Vytvořit plán
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan, index) => {
            const client = clients.find((c) => c.id === plan.client_id);
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="glass cursor-pointer hover:bg-accent/50 transition-colors group"
                  onClick={() => navigate(`/training-plans/${plan.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{plan.name}</CardTitle>
                        <p className="text-sm text-muted-foreground truncate">
                          {client?.name || 'Neznámý klient'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/training-plans/${plan.id}`); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Upravit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplikovat
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Play className="w-4 h-4 mr-2" />
                            Generovat tréninky
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setDeleteId(plan.id); }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Smazat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">{getGoalLabel(plan.primary_goal)}</Badge>
                      <Badge variant="outline">{getPhaseLabel(plan.phase)}</Badge>
                      {plan.is_active && <Badge className="bg-green-500/20 text-green-500">Aktivní</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(plan.period_start), 'd. M. yyyy', { locale: cs })}
                      </div>
                      <span>{plan.days_per_week}× týdně</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreatePlanDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat plán?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Plán a všechny jeho týdny, dny a cviky budou trvale odstraněny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
