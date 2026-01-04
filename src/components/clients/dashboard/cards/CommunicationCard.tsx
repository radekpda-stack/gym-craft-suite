/**
 * Communication Dashboard Card
 * Shows: Unread messages, notes count, last message
 */
import { MessageSquare, FileText, Clock } from 'lucide-react';
import { ClientDashboardCard, DashboardMetric } from '../ClientDashboardCard';
import { useCommunicationMetrics } from '@/hooks/useClientDashboardMetrics';
import { useTrackSectionOpen } from '@/hooks/useSectionUsage';
import { ClientChatSection } from '@/components/clients/ClientChatSection';
import { ClientNotesSection } from '@/components/clients/ClientNotesSection';
import { ClientCommunicationLog } from '@/components/clients/ClientCommunicationLog';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface CommunicationCardProps {
  clientId: string;
  clientName: string;
  notes: string | null;
  onAddNote: (note: string) => Promise<void>;
}

export function CommunicationCard({ 
  clientId, 
  clientName,
  notes,
  onAddNote,
}: CommunicationCardProps) {
  const { unreadCount, noteCount, lastMessageAt } = useCommunicationMetrics(clientId);
  const trackSection = useTrackSectionOpen();

  const formatLastMessage = () => {
    if (!lastMessageAt) return '–';
    try {
      return formatDistanceToNow(new Date(lastMessageAt), { addSuffix: true, locale: cs });
    } catch {
      return '–';
    }
  };

  const metrics: DashboardMetric[] = [
    {
      label: 'Nepřečtené zprávy',
      value: unreadCount,
      icon: <MessageSquare className="w-4 h-4" />,
      highlight: unreadCount > 0,
    },
    {
      label: 'Poznámky',
      value: noteCount,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: 'Poslední zpráva',
      value: formatLastMessage(),
      icon: <Clock className="w-4 h-4" />,
    },
  ];

  const handleExpand = () => {
    trackSection.mutate({ clientId, sectionId: 'chat' });
  };

  return (
    <ClientDashboardCard
      id="communication"
      icon={<MessageSquare className="w-5 h-5" />}
      title="Komunikace"
      metrics={metrics}
      badge={unreadCount > 0 ? unreadCount : undefined}
      badgeVariant={unreadCount > 0 ? 'error' : 'default'}
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Chat s klientem</h4>
          <ClientChatSection clientId={clientId} clientName={clientName} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Poznámky & Log hovorů</h4>
          <ClientNotesSection notes={notes} onAddNote={onAddNote} />
          <ClientCommunicationLog clientId={clientId} />
        </div>
      </div>
    </ClientDashboardCard>
  );
}
