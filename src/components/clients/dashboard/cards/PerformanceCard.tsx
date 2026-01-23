/**
 * Performance Dashboard Card
 * Shows: PRs count, monthly trainings, feedback rating, training load
 */
import { Trophy, Activity, Star, Download } from 'lucide-react';
import { ClientDashboardCard, DashboardMetric } from '../ClientDashboardCard';
import { usePerformanceMetrics } from '@/hooks/useClientDashboardMetrics';
import { useTrackSectionOpen } from '@/hooks/useSectionUsage';
import { ClientPRsCard } from '@/components/clients/ClientPRsCard';
import { ClientTagAnalyticsCard } from '@/components/clients/ClientTagAnalyticsCard';
import { ClientFeedbackRecovery } from '@/components/clients/ClientFeedbackRecovery';
import { ClientFeedbackCard } from '@/components/clients/ClientFeedbackCard';
import { ClientTrainingLoadCard } from '@/components/clients/ClientTrainingLoadCard';
import { ClientPerformanceExportDialog } from '@/components/clients/ClientPerformanceExportDialog';
import { Button } from '@/components/ui/button';

interface PerformanceCardProps {
  clientId: string;
  clientName: string;
  lastCompletedTrainingId?: string;
  isFavorite?: boolean;
}

export function PerformanceCard({ 
  clientId, 
  clientName,
  lastCompletedTrainingId,
  isFavorite 
}: PerformanceCardProps) {
  const { prCount, monthlyTrainings, avgFeedbackRating, feedbackCount } = usePerformanceMetrics(clientId);
  const trackSection = useTrackSectionOpen();

  const metrics: DashboardMetric[] = [
    {
      label: 'Osobní rekordy',
      value: prCount,
      icon: <Trophy className="w-4 h-4" />,
      highlight: prCount > 0,
    },
    {
      label: 'Tréninků/měsíc',
      value: monthlyTrainings,
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: 'Avg. feedback',
      value: avgFeedbackRating ? `${avgFeedbackRating}/10` : '–',
      icon: <Star className="w-4 h-4" />,
    },
  ];

  const handleExpand = () => {
    trackSection.mutate({ clientId, sectionId: 'prs' });
  };

  return (
    <ClientDashboardCard
      id="performance"
      icon={<Trophy className="w-5 h-5" />}
      title="Výkon"
      metrics={metrics}
      badge={feedbackCount > 0 ? feedbackCount : undefined}
      isFavorite={isFavorite}
    >
      <div className="space-y-4">
        {/* Export button */}
        <div className="flex justify-end">
          <ClientPerformanceExportDialog
            clientId={clientId}
            clientName={clientName}
            trigger={
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export výkonu
              </Button>
            }
          />
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Zátěž a náročnost</h4>
          <ClientTrainingLoadCard clientId={clientId} className="border-0 shadow-none" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Osobní rekordy</h4>
          <ClientPRsCard clientId={clientId} clientName={clientName} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Analytika tréninků</h4>
          <ClientTagAnalyticsCard clientId={clientId} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Feedback & Recovery</h4>
          <ClientFeedbackRecovery clientId={clientId} />
          <ClientFeedbackCard 
            clientId={clientId} 
            clientName={clientName}
            lastCompletedTrainingId={lastCompletedTrainingId}
          />
        </div>
      </div>
    </ClientDashboardCard>
  );
}