/**
 * Health Dashboard Card
 * Shows: Active pains, health restrictions, last diagnostic
 */
import { Heart, AlertTriangle, Stethoscope } from 'lucide-react';
import { ClientDashboardCard, DashboardMetric } from '../ClientDashboardCard';
import { useHealthMetrics } from '@/hooks/useClientDashboardMetrics';
import { useTrackSectionOpen } from '@/hooks/useSectionUsage';
import { ClientPreDiagnosticSection } from '@/components/clients/ClientPreDiagnosticSection';
import { ClientDiagnosticsSection } from '@/components/clients/ClientDiagnosticsSection';
import { ClientPainMapPreview } from '@/components/clients/ClientPainMapPreview';
import { ClientInjuryHistory } from '@/components/clients/ClientInjuryHistory';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface HealthCardProps {
  clientId: string;
  clientName: string;
}

export function HealthCard({ clientId, clientName }: HealthCardProps) {
  const { activePains, hasHighSeverity, lastDiagnosticAt, hasRestrictions } = useHealthMetrics(clientId);
  const trackSection = useTrackSectionOpen();

  const formatLastDiagnostic = () => {
    if (!lastDiagnosticAt) return '–';
    try {
      return formatDistanceToNow(new Date(lastDiagnosticAt), { addSuffix: true, locale: cs });
    } catch {
      return '–';
    }
  };

  const metrics: DashboardMetric[] = [
    {
      label: 'Aktivní bolesti',
      value: activePains > 0 ? `${activePains} ⚠️` : 'Žádné',
      icon: <AlertTriangle className="w-4 h-4" />,
      highlight: activePains > 0,
    },
    {
      label: 'Omezení',
      value: hasRestrictions ? 'Aktivní' : 'Žádné',
      icon: <Heart className="w-4 h-4" />,
      highlight: hasRestrictions,
    },
    {
      label: 'Poslední diagnostika',
      value: formatLastDiagnostic(),
      icon: <Stethoscope className="w-4 h-4" />,
    },
  ];

  const handleExpand = () => {
    trackSection.mutate({ clientId, sectionId: 'diagnostics' });
  };

  return (
    <ClientDashboardCard
      id="health"
      icon={<Heart className="w-5 h-5" />}
      title="Zdraví"
      metrics={metrics}
      badge={activePains > 0 ? activePains : undefined}
      badgeVariant={hasHighSeverity ? 'error' : activePains > 0 ? 'warning' : 'default'}
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Diagnostika & Mapa bolesti</h4>
          <ClientPreDiagnosticSection clientId={clientId} clientName={clientName} />
          <ClientDiagnosticsSection clientId={clientId} clientName={clientName} />
          <ClientPainMapPreview clientId={clientId} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Historie zranění</h4>
          <ClientInjuryHistory clientId={clientId} />
        </div>
      </div>
    </ClientDashboardCard>
  );
}
