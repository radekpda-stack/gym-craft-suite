/**
 * History Dashboard Card
 * Shows: Event count, last event date
 */
import { Clock, Calendar, Activity } from 'lucide-react';
import { ClientDashboardCard, DashboardMetric } from '../ClientDashboardCard';
import { useHistoryMetrics } from '@/hooks/useClientDashboardMetrics';
import { useTrackSectionOpen } from '@/hooks/useSectionUsage';
import { ClientTimeline } from '@/components/clients/ClientTimeline';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface HistoryCardProps {
  clientId: string;
}

export function HistoryCard({ clientId }: HistoryCardProps) {
  const { eventCount, lastEventDate } = useHistoryMetrics(clientId);
  const trackSection = useTrackSectionOpen();

  const formatLastEvent = () => {
    if (!lastEventDate) return '–';
    try {
      return format(new Date(lastEventDate), 'd.M.yyyy', { locale: cs });
    } catch {
      return '–';
    }
  };

  const metrics: DashboardMetric[] = [
    {
      label: 'Celkem událostí',
      value: eventCount,
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: 'Poslední událost',
      value: formatLastEvent(),
      icon: <Calendar className="w-4 h-4" />,
    },
  ];

  const handleExpand = () => {
    trackSection.mutate({ clientId, sectionId: 'timeline' });
  };

  return (
    <ClientDashboardCard
      id="history"
      icon={<Clock className="w-5 h-5" />}
      title="Historie"
      metrics={metrics}
    >
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Časová osa</h4>
        <ClientTimeline clientId={clientId} defaultLimit={20} />
      </div>
    </ClientDashboardCard>
  );
}
