/**
 * CompletedFeedbacksTab - Simplified chronological list of completed feedbacks
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Calendar,
  CheckCircle2,
  MessageSquare,
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
import { FeedbackDetailDialog } from './FeedbackDetailDialog';
import type { TrainingFeedback } from '@/hooks/useTrainingFeedback';

type PeriodOption = '7' | '30' | '90' | 'all';

interface CompletedFeedbacksTabProps {
  initialClientId?: string;
}

export function CompletedFeedbacksTab({ initialClientId }: CompletedFeedbacksTabProps) {
  // Default to 'all' for simpler chronological view
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || 'all');
  
  // Dialog state
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMeta, setDialogMeta] = useState<{ clientName?: string; trainingDate?: string }>({});

  const { data: clients = [] } = useClients();

  // Fetch completed feedbacks - FIXED: removed non-existent training_template_id
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['completed-feedbacks', period, selectedClientId],
    queryFn: async () => {
      let query = supabase
        .from('training_feedback')
        .select(`
          *,
          training_sessions (
            id,
            date,
            training_type
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
        trainingDate: item.training_sessions?.date || item.training_date,
        trainingType: item.training_sessions?.training_type,
      }));
    },
  });

  // Simple chronological sorting (newest first)
  const sortedFeedbacks = useMemo(() => {
    if (!feedbackData) return [];
    return [...feedbackData].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [feedbackData]);

  const handleOpenDetail = (feedback: TrainingFeedback, clientName: string, trainingDate?: string) => {
    setSelectedFeedback(feedback);
    setDialogMeta({ clientName, trainingDate });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Simple Filters Card */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Vyplněné feedbacky
            {sortedFeedbacks.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({sortedFeedbacks.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simple Filters - Period and Client only */}
          <div className="flex flex-wrap gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
              <SelectTrigger className="w-[130px] h-9">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vše</SelectItem>
                <SelectItem value="7">7 dní</SelectItem>
                <SelectItem value="30">30 dní</SelectItem>
                <SelectItem value="90">90 dní</SelectItem>
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
        </CardContent>
      </Card>

      {/* Feedback List - Simple chronological */}
      <Card className="glass">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : sortedFeedbacks.length > 0 ? (
            <div className="space-y-3">
              {sortedFeedbacks.map((feedback) => {
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
                Žádné vyplněné feedbacky
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