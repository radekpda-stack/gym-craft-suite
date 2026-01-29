/**
 * CompletedFeedbacksTab - New "Vyplněné" tab with expanded cards and advanced filtering
 * Replaces the basic history view for completed feedbacks
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Calendar,
  CheckCircle2,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from '@/hooks/useClients';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { FeedbackExpandedCard } from './FeedbackExpandedCard';
import { FeedbackQuickFilters, useDefaultQuickFilters, SeverityFilter, SortField, SortOrder } from './FeedbackQuickFilters';
import { ClientFeedbackLeaderboard } from './ClientFeedbackLeaderboard';
import { FeedbackDetailDialog } from './FeedbackDetailDialog';
import type { TrainingFeedback } from '@/hooks/useTrainingFeedback';

type PeriodOption = '7' | '30' | '90' | 'all';

interface CompletedFeedbacksTabProps {
  initialClientId?: string;
}

export function CompletedFeedbacksTab({ initialClientId }: CompletedFeedbacksTabProps) {
  const [period, setPeriod] = useState<PeriodOption>('30');
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || 'all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Dialog state
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMeta, setDialogMeta] = useState<{ clientName?: string; trainingDate?: string }>({});

  const { filters, toggleFilter, clearFilters, activeCount } = useDefaultQuickFilters();
  const { data: clients = [] } = useClients();

  // Fetch completed feedbacks
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['completed-feedbacks', period, selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from('training_feedback')
        .select(`
          *,
          training_sessions!inner (
            id,
            date,
            training_template_id
          )
        `)
        .order('created_at', { ascending: false });

      // Period filter
      if (period !== 'all') {
        const startDate = subDays(new Date(), parseInt(period));
        query = query.gte('created_at', startOfDay(startDate).toISOString());
      }

      // Client filter
      if (selectedClientId !== 'all') {
        query = query.eq('client_id', selectedClientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        trainingDate: (item.training_sessions as any)?.date,
      }));
    },
  });

  // Apply filters and sorting
  const filteredFeedbacks = useMemo(() => {
    if (!feedbackData) return [];

    let result = [...feedbackData];

    // Severity filter
    if (severity !== 'all') {
      result = result.filter((f) => {
        const isRedFlag = f.is_red_flag;
        const highPain = f.pain && f.pain >= 6;
        const mediumPain = f.pain && f.pain >= 4 && f.pain < 6;
        const lowBodyFeel = f.body_feel && f.body_feel <= 5;

        switch (severity) {
          case 'critical':
            return isRedFlag || highPain;
          case 'warning':
            return mediumPain || lowBodyFeel;
          case 'ok':
            return !isRedFlag && (!f.pain || f.pain < 4) && (!f.body_feel || f.body_feel > 5);
          default:
            return true;
        }
      });
    }

    // Quick filters
    const activeFilters = filters.filter((f) => f.active);
    if (activeFilters.length > 0) {
      result = result.filter((f) => {
        return activeFilters.every((filter) => {
          switch (filter.id) {
            case 'high_pain':
              return f.pain && f.pain >= 6;
            case 'low_energy':
              return f.energy_rating && f.energy_rating <= 4;
            case 'high_soreness':
              return f.soreness && f.soreness >= 7;
            case 'has_comment':
              return !!f.comment;
            case 'red_flags':
              return f.is_red_flag;
            default:
              return true;
          }
        });
      });
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'date':
          aVal = a.created_at;
          bVal = b.created_at;
          break;
        case 'pain':
          aVal = a.pain ?? 0;
          bVal = b.pain ?? 0;
          break;
        case 'body_feel':
          aVal = a.body_feel ?? 0;
          bVal = b.body_feel ?? 0;
          break;
        case 'energy':
          aVal = a.energy_rating ?? 0;
          bVal = b.energy_rating ?? 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'desc' 
          ? bVal.localeCompare(aVal) 
          : aVal.localeCompare(bVal);
      }

      return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    return result;
  }, [feedbackData, severity, filters, sortField, sortOrder]);

  const handleOpenDetail = (feedback: TrainingFeedback, clientName: string, trainingDate?: string) => {
    setSelectedFeedback(feedback);
    setDialogMeta({ clientName, trainingDate });
    setDialogOpen(true);
  };

  const handleClientFromLeaderboard = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleClearFilters = () => {
    setSeverity('all');
    clearFilters();
  };

  const totalActiveFilters = activeCount + (severity !== 'all' ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Client Leaderboard */}
      <ClientFeedbackLeaderboard 
        days={parseInt(period) || 30}
        limit={5}
        onClientClick={handleClientFromLeaderboard}
      />

      {/* Filters Card */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Vyplněné feedbacky
            {filteredFeedbacks.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredFeedbacks.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
              <SelectTrigger className="w-[130px] h-9">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dní</SelectItem>
                <SelectItem value="30">30 dní</SelectItem>
                <SelectItem value="90">90 dní</SelectItem>
                <SelectItem value="all">Vše</SelectItem>
              </SelectContent>
            </Select>

            <ClientSearchSelect
              clients={clients.filter((c) => !c.is_archived)}
              value={selectedClientId === 'all' ? '' : selectedClientId}
              onValueChange={(v) => setSelectedClientId(v || 'all')}
              placeholder="Všichni klienti"
              allowAll
              allLabel="Všichni klienti"
              className="w-[180px]"
            />
          </div>

          {/* Advanced Filters */}
          <FeedbackQuickFilters
            severity={severity}
            onSeverityChange={setSeverity}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={(field, order) => {
              setSortField(field);
              setSortOrder(order);
            }}
            quickFilters={filters}
            onQuickFilterToggle={toggleFilter}
            activeFilterCount={totalActiveFilters}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card className="glass">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filteredFeedbacks.length > 0 ? (
            <div className="space-y-3">
              {filteredFeedbacks.map((feedback) => {
                const client = clients.find((c) => c.id === feedback.client_id);
                const clientName = client?.name || 'Neznámý klient';

                return (
                  <FeedbackExpandedCard
                    key={feedback.id}
                    feedback={feedback as TrainingFeedback}
                    clientName={clientName}
                    trainingDate={feedback.trainingDate}
                    onOpenDetail={() => handleOpenDetail(feedback as TrainingFeedback, clientName, feedback.trainingDate)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {totalActiveFilters > 0 
                  ? 'Žádné feedbacky odpovídající filtrům' 
                  : 'Žádné vyplněné feedbacky za vybrané období'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedFeedback(null);
            setDialogMeta({});
          }
        }}
        clientName={dialogMeta.clientName}
        trainingDate={dialogMeta.trainingDate}
      />
    </div>
  );
}
