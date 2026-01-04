/**
 * Body Dashboard Card
 * Shows: Weight, measurements count, media count
 */
import { User, Scale, Camera, TrendingUp, TrendingDown } from 'lucide-react';
import { ClientDashboardCard, DashboardMetric } from '../ClientDashboardCard';
import { useBodyMetrics } from '@/hooks/useClientDashboardMetrics';
import { useTrackSectionOpen } from '@/hooks/useSectionUsage';
import { ClientMeasurementsCard } from '@/components/clients/ClientMeasurementsCard';
import { ClientNutritionCard } from '@/components/clients/ClientNutritionCard';
import { ClientMediaGallery } from '@/components/clients/ClientMediaGallery';

interface BodyCardProps {
  clientId: string;
  clientName: string;
}

export function BodyCard({ clientId, clientName }: BodyCardProps) {
  const { currentWeight, weightChange, measurementCount, mediaCount } = useBodyMetrics(clientId);
  const trackSection = useTrackSectionOpen();

  const formatWeight = () => {
    if (!currentWeight) return '–';
    const change = weightChange 
      ? ` (${weightChange > 0 ? '+' : ''}${weightChange}kg)` 
      : '';
    return `${currentWeight}kg${change}`;
  };

  const metrics: DashboardMetric[] = [
    {
      label: 'Váha',
      value: formatWeight(),
      icon: <Scale className="w-4 h-4" />,
      trend: weightChange ? (weightChange > 0 ? 'up' : 'down') : undefined,
    },
    {
      label: 'Měření',
      value: measurementCount,
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      label: 'Média',
      value: mediaCount,
      icon: <Camera className="w-4 h-4" />,
      highlight: mediaCount > 0,
    },
  ];

  const handleExpand = () => {
    trackSection.mutate({ clientId, sectionId: 'measurements' });
  };

  return (
    <ClientDashboardCard
      id="body"
      icon={<User className="w-5 h-5" />}
      title="Tělo"
      metrics={metrics}
    >
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Měření</h4>
          <ClientMeasurementsCard clientId={clientId} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Výživa & Výzvy</h4>
          <ClientNutritionCard clientId={clientId} clientName={clientName} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Média & Fotky</h4>
          <ClientMediaGallery clientId={clientId} />
        </div>
      </div>
    </ClientDashboardCard>
  );
}
