import { Dumbbell, CalendarDays, XCircle, Clock } from 'lucide-react';
import { KPIDetailModal } from './KPIDetailModal';
import { AnnualStatsData } from '@/hooks/useAnnualStats';
import { formatCurrency } from '@/lib/formatters';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { format } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

interface TrainingsDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: AnnualStatsData;
}

export function TrainingsDetailModal({ open, onOpenChange, stats }: TrainingsDetailModalProps) {
  const { language } = useLanguage();

  const formatMonth = (monthStr: string) => {
    if (!monthStr || monthStr === '-') return '-';
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, 'LLLL yyyy', { locale: language === 'cs' ? cs : enUS });
    } catch {
      return monthStr;
    }
  };

  const dayLabels: Record<string, { cs: string; en: string }> = {
    monday: { cs: 'Pondělí', en: 'Monday' },
    tuesday: { cs: 'Úterý', en: 'Tuesday' },
    wednesday: { cs: 'Středa', en: 'Wednesday' },
    thursday: { cs: 'Čtvrtek', en: 'Thursday' },
    friday: { cs: 'Pátek', en: 'Friday' },
    saturday: { cs: 'Sobota', en: 'Saturday' },
    sunday: { cs: 'Neděle', en: 'Sunday' },
  };

  const formatDay = (day: string) => {
    const d = dayLabels[day.toLowerCase()];
    return d ? d[language as 'cs' | 'en'] : day;
  };

  const modalStats = [
    {
      label: language === 'cs' ? 'Zrušené' : 'Canceled',
      value: stats.canceledTrainings,
    },
    {
      label: language === 'cs' ? 'Pozdě zrušené' : 'Late canceled',
      value: stats.lateCancellations,
    },
    {
      label: language === 'cs' ? 'Ø tréninků/týden' : 'Avg/week',
      value: stats.avgTrainingsPerWeek.toFixed(1),
    },
    {
      label: language === 'cs' ? 'Ø cena tréninku' : 'Avg price',
      value: formatCurrency(stats.avgTrainingPrice),
    },
  ];

  return (
    <KPIDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={language === 'cs' ? 'Detail tréninků' : 'Trainings Detail'}
      icon={<Dumbbell className="w-5 h-5" />}
      mainValue={stats.completedTrainings}
      mainLabel={language === 'cs' ? 'dokončených tréninků' : 'completed trainings'}
      stats={modalStats}
    >
      {/* Additional info */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {language === 'cs' ? 'Nejaktivnější měsíc:' : 'Most active month:'}
          </span>
          <span className="font-medium">{formatMonth(stats.mostActiveMonth)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-muted-foreground">
            {language === 'cs' ? 'Nejaktivnější den:' : 'Most active day:'}
          </span>
          <span className="font-medium">{formatDay(stats.mostActiveDay)}</span>
        </div>
      </div>

      {/* Trend chart */}
      {stats.monthlyTrend && stats.monthlyTrend.length > 1 && (
        <div className="pt-4">
          <p className="text-xs text-muted-foreground mb-2">
            {language === 'cs' ? 'Měsíční trend' : 'Monthly trend'}
          </p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrend} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                <defs>
                  <linearGradient id="trainingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [value, language === 'cs' ? 'Tréninků' : 'Trainings']}
                />
                <Area
                  type="monotone"
                  dataKey="trainings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#trainingsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </KPIDetailModal>
  );
}
