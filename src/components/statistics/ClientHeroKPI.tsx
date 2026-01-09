import { MetricCard, GaugeCard } from '@/components/charts';
import { 
  Users, 
  UserCheck, 
  Clock,
  MessageCircle
} from 'lucide-react';

interface ClientHeroKPIProps {
  activeClients: number;
  totalClients: number;
  retentionRate: number;
  avgLifetimeMonths: number;
  avgFeedbackScore?: number;
  totalFeedback?: number;
  onCardClick?: (card: string) => void;
}

export function ClientHeroKPI({ 
  activeClients,
  totalClients,
  retentionRate,
  avgLifetimeMonths,
  avgFeedbackScore,
  totalFeedback = 0,
  onCardClick 
}: ClientHeroKPIProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Active clients */}
      <MetricCard
        title="Aktivní klienti"
        value={activeClients.toString()}
        subtitle={`z ${totalClients} celkem`}
        progress={totalClients > 0 ? (activeClients / totalClients) * 100 : 0}
        variant="primary"
        icon={<Users className="h-4 w-4" />}
        onClick={() => onCardClick?.('clients')}
        showProgressValue
      />
      
      {/* Retention rate */}
      <GaugeCard
        title="Retence (60d)"
        value={retentionRate}
        maxValue={100}
        displayValue={`${retentionRate}%`}
        sublabel="aktivních"
        description="Alespoň 1 trénink za 60 dní"
        variant={retentionRate >= 80 ? 'success' : retentionRate >= 60 ? 'warning' : 'destructive'}
        size="md"
        onClick={() => onCardClick?.('retention')}
      />

      {/* Average lifetime */}
      <MetricCard
        title="Ø Délka spolupráce"
        value={avgLifetimeMonths.toFixed(1)}
        subtitle="měsíců průměrně"
        progress={Math.min((avgLifetimeMonths / 24) * 100, 100)} // 24 months = 100%
        variant="blue"
        icon={<Clock className="h-4 w-4" />}
        onClick={() => onCardClick?.('tenure')}
      />

      {/* Body feel score - scale is 1-10 */}
      {avgFeedbackScore !== undefined && avgFeedbackScore > 0 ? (
        <GaugeCard
          title="Ø Pocit těla"
          value={avgFeedbackScore}
          maxValue={10}
          displayValue={avgFeedbackScore.toFixed(1)}
          sublabel="/10"
          description={`Z ${totalFeedback} odpovědí`}
          variant={avgFeedbackScore >= 8 ? 'success' : avgFeedbackScore >= 6 ? 'warning' : 'destructive'}
          size="md"
          onClick={() => onCardClick?.('feedback')}
        />
      ) : (
        <MetricCard
          title="Ø Pocit těla"
          value="-"
          subtitle="Žádný feedback"
          progress={0}
          variant="primary"
          icon={<MessageCircle className="h-4 w-4" />}
          onClick={() => onCardClick?.('feedback')}
        />
      )}
    </div>
  );
}
