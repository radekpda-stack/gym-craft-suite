import { Users, Archive, Dumbbell, Wallet, Trophy } from 'lucide-react';
import { KPIDetailModal } from './KPIDetailModal';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { formatCurrency } from '@/lib/formatters';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ClientsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData;
}

export function ClientsDetailModal({ open, onOpenChange, stats }: ClientsDetailModalProps) {
  const { language } = useLanguage();

  const modalStats = [
    {
      label: language === 'cs' ? 'Archivovaní' : 'Archived',
      value: stats.archivedClients,
    },
    {
      label: language === 'cs' ? 'Celkem' : 'Total',
      value: stats.totalClients,
    },
    {
      label: language === 'cs' ? 'Ø tréninků/klient' : 'Avg trainings/client',
      value: stats.avgTrainingsPerClient.toFixed(1),
    },
    {
      label: language === 'cs' ? 'Aktivních dnů' : 'Active days',
      value: stats.activeDays,
    },
  ];

  return (
    <KPIDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={language === 'cs' ? 'Detail klientů' : 'Clients Detail'}
      icon={<Users className="w-5 h-5" />}
      mainValue={stats.activeClients}
      mainLabel={language === 'cs' ? 'aktivních klientů' : 'active clients'}
      stats={modalStats}
    >
      {/* Top clients by trainings */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">
            {language === 'cs' ? 'TOP 5 podle tréninků' : 'TOP 5 by trainings'}
          </p>
        </div>
        <div className="space-y-1.5">
          {stats.topClientsByTrainings.slice(0, 5).map((client, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <span className="truncate">{client.name}</span>
              </div>
              <span className="text-muted-foreground">{client.count}×</span>
            </div>
          ))}
          {stats.topClientsByTrainings.length === 0 && (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>
      </div>

      {/* Top clients by spent */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-green-500" />
          <p className="text-sm font-medium">
            {language === 'cs' ? 'TOP 5 podle útraty' : 'TOP 5 by spending'}
          </p>
        </div>
        <div className="space-y-1.5">
          {stats.topClientsBySpent.slice(0, 5).map((client, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500/10 text-green-500 text-xs flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <span className="truncate">{client.name}</span>
              </div>
              <span className="text-muted-foreground">{formatCurrency(client.amount)}</span>
            </div>
          ))}
          {stats.topClientsBySpent.length === 0 && (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>
      </div>
    </KPIDetailModal>
  );
}
