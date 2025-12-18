import { useState } from 'react';
import { Dumbbell, Users, Wallet, Activity, FileDown, ShoppingBag, TrendingUp } from 'lucide-react';
import { TrainingsDetailModal } from './TrainingsDetailModal';
import { ClientsDetailModal } from './ClientsDetailModal';
import { IncomeDetailModal } from './IncomeDetailModal';
import { ExercisesDetailModal } from './ExercisesDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useAnnualStats, StatsPeriod } from '@/hooks/useAnnualStats';
import { useAppSettings } from '@/hooks/useAppSettings';
import { downloadAnnualStatsPdf } from '@/lib/annualStatsPdf';
import { formatCurrency } from '@/lib/formatters';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cs, enUS } from 'date-fns/locale';

type ModalType = 'trainings' | 'clients' | 'income' | 'exercises' | null;

export function StatsOverviewCard() {
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { data: stats, isLoading } = useAnnualStats(period);
  const { data: settings } = useAppSettings();
  const { language, t } = useLanguage();

  const companyProfile = settings?.company_profile as {
    name?: string;
    ico?: string;
    address?: string;
    logoUrl?: string;
  } | undefined;

  const handleExportPdf = async () => {
    if (!stats) return;
    
    setIsExporting(true);
    try {
      await downloadAnnualStatsPdf(stats, {
        language: language as 'cs' | 'en',
        companyName: companyProfile?.name,
        companyId: companyProfile?.ico,
        companyAddress: companyProfile?.address,
        companyLogoUrl: companyProfile?.logoUrl,
      });
      toast({
        title: language === 'cs' ? 'PDF exportováno' : 'PDF exported',
        description: language === 'cs' ? 'Statistiky byly staženy' : 'Statistics downloaded',
      });
    } catch (error) {
      toast({
        title: language === 'cs' ? 'Chyba exportu' : 'Export error',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Format most active month for display
  const formatMostActiveMonth = (monthStr: string) => {
    if (!monthStr || monthStr === '-') return '-';
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, 'LLLL yyyy', { locale: language === 'cs' ? cs : enUS });
    } catch {
      return monthStr;
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-24" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const metrics = [
    {
      id: 'trainings' as const,
      icon: <Dumbbell className="w-4 h-4" />,
      value: stats.completedTrainings,
      label: language === 'cs' ? 'tréninků' : 'trainings',
      color: 'text-primary',
    },
    {
      id: 'clients' as const,
      icon: <Users className="w-4 h-4" />,
      value: stats.activeClients,
      label: language === 'cs' ? 'klientů' : 'clients',
      color: 'text-blue-500',
    },
    {
      id: 'income' as const,
      icon: <Wallet className="w-4 h-4" />,
      value: formatCurrency(stats.totalIncome),
      label: language === 'cs' ? 'příjem' : 'income',
      color: 'text-green-500',
    },
    {
      id: 'exercises' as const,
      icon: <Activity className="w-4 h-4" />,
      value: stats.totalExerciseEntries.toLocaleString(),
      label: language === 'cs' ? 'cviků' : 'exercises',
      color: 'text-purple-500',
    },
  ];

  const highlights = [
    {
      icon: <Dumbbell className="w-4 h-4 text-primary" />,
      label: language === 'cs' ? 'Nejvíce tréninků' : 'Most trainings',
      value: stats.topClientsByTrainings[0] 
        ? `${stats.topClientsByTrainings[0].name} (${stats.topClientsByTrainings[0].count}×)`
        : '-',
    },
    {
      icon: <Wallet className="w-4 h-4 text-green-500" />,
      label: language === 'cs' ? 'Největší útrata' : 'Highest spent',
      value: stats.topClientsBySpent[0]
        ? `${stats.topClientsBySpent[0].name} (${formatCurrency(stats.topClientsBySpent[0].amount)})`
        : '-',
    },
    {
      icon: <ShoppingBag className="w-4 h-4 text-purple-500" />,
      label: language === 'cs' ? 'Nejvíce produktů' : 'Most products',
      value: stats.topClientByProducts
        ? `${stats.topClientByProducts.name} (${stats.topClientByProducts.count}×)`
        : '-',
    },
  ];

  return (
    <Card className="glass col-span-1 lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            {language === 'cs' ? 'Souhrnné statistiky' : 'Summary Statistics'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as StatsPeriod)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'cs' ? 'Celkem' : 'All time'}</SelectItem>
                <SelectItem value="year">{language === 'cs' ? 'Tento rok' : 'This year'}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              onClick={() => setActiveModal(metric.id)}
              className="p-3 rounded-xl bg-secondary/50 text-center cursor-pointer hover:bg-secondary/70 hover:scale-[1.02] transition-all duration-200"
            >
              <div className={`flex items-center justify-center gap-1.5 ${metric.color}`}>
                {metric.icon}
                <span className="text-lg font-bold">{metric.value}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Mini Trend Chart */}
        {stats.monthlyTrend && stats.monthlyTrend.length > 1 && (
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrend} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
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
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="trainings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Highlights */}
        <div className="space-y-2">
          {highlights.map((highlight, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {highlight.icon}
              <span className="text-muted-foreground">{highlight.label}:</span>
              <span className="font-medium truncate">{highlight.value}</span>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Detail Modals */}
      <TrainingsDetailModal
        open={activeModal === 'trainings'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
      <ClientsDetailModal
        open={activeModal === 'clients'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
      <IncomeDetailModal
        open={activeModal === 'income'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
      <ExercisesDetailModal
        open={activeModal === 'exercises'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
    </Card>
  );
}
