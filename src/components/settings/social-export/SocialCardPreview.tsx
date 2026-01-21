import { useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { SocialExportData, ExportFormat, ExportTheme, ExportSettings } from '@/types/socialExport';
import { Trophy, Users, Dumbbell, Clock, TrendingUp, Calendar, Target, Award } from 'lucide-react';

interface SocialCardPreviewProps {
  data: SocialExportData | null;
  selectedMetrics: string[];
  settings: ExportSettings;
  isLoading?: boolean;
}

const METRIC_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  getValue: (data: SocialExportData) => string;
  getSubtext?: (data: SocialExportData) => string | null;
}> = {
  activeClients: {
    label: 'Aktivní klienti',
    icon: <Users className="w-5 h-5" />,
    getValue: (d) => d.activeClients.toString(),
  },
  newClientsThisMonth: {
    label: 'Noví klienti',
    icon: <Users className="w-5 h-5" />,
    getValue: (d) => `+${d.newClientsThisMonth}`,
    getSubtext: () => 'tento měsíc',
  },
  trainingsThisMonth: {
    label: 'Tréninky',
    icon: <Dumbbell className="w-5 h-5" />,
    getValue: (d) => d.trainingsThisMonth.toString(),
    getSubtext: () => 'tento měsíc',
  },
  trainingsThisYear: {
    label: 'Tréninky',
    icon: <Dumbbell className="w-5 h-5" />,
    getValue: (d) => d.trainingsThisYear.toString(),
    getSubtext: () => 'letos',
  },
  trainingsTotal: {
    label: 'Celkem tréninků',
    icon: <Dumbbell className="w-5 h-5" />,
    getValue: (d) => d.trainingsTotal.toLocaleString('cs-CZ'),
  },
  hoursThisMonth: {
    label: 'Hodin',
    icon: <Clock className="w-5 h-5" />,
    getValue: (d) => `${d.hoursThisMonth}h`,
    getSubtext: () => 'tento měsíc',
  },
  hoursThisYear: {
    label: 'Hodin',
    icon: <Clock className="w-5 h-5" />,
    getValue: (d) => `${d.hoursThisYear}h`,
    getSubtext: () => 'letos',
  },
  hoursTotal: {
    label: 'Celkem hodin',
    icon: <Clock className="w-5 h-5" />,
    getValue: (d) => `${d.hoursTotal.toLocaleString('cs-CZ')}h`,
  },
  prsThisMonth: {
    label: 'Osobní rekordy',
    icon: <Trophy className="w-5 h-5" />,
    getValue: (d) => d.prsThisMonth.toString(),
    getSubtext: () => 'tento měsíc',
  },
  prsThisYear: {
    label: 'Osobní rekordy',
    icon: <Trophy className="w-5 h-5" />,
    getValue: (d) => d.prsThisYear.toString(),
    getSubtext: () => 'letos',
  },
  prsTotal: {
    label: 'Celkem PR',
    icon: <Trophy className="w-5 h-5" />,
    getValue: (d) => d.prsTotal.toLocaleString('cs-CZ'),
  },
  maxWeightLifted: {
    label: 'Max váha',
    icon: <TrendingUp className="w-5 h-5" />,
    getValue: (d) => d.maxWeightLifted ? `${d.maxWeightLifted} kg` : '-',
    getSubtext: (d) => d.maxWeightExercise || null,
  },
  prVelocity: {
    label: 'PR za týden',
    icon: <Target className="w-5 h-5" />,
    getValue: (d) => d.prVelocity.toString(),
    getSubtext: () => 'průměr',
  },
  totalVolumeTons: {
    label: 'Celkový objem',
    icon: <Dumbbell className="w-5 h-5" />,
    getValue: (d) => `${d.totalVolumeTons}t`,
  },
  maleVsFemale: {
    label: 'Muži vs Ženy',
    icon: <Users className="w-5 h-5" />,
    getValue: (d) => `${d.maleClients} : ${d.femaleClients}`,
  },
  leftVsRight: {
    label: 'Leváci vs Praváci',
    icon: <Users className="w-5 h-5" />,
    getValue: (d) => `${d.leftHandedClients} : ${d.rightHandedClients}`,
  },
  avgClientAge: {
    label: 'Průměrný věk',
    icon: <Calendar className="w-5 h-5" />,
    getValue: (d) => d.avgClientAge ? `${d.avgClientAge} let` : '-',
  },
  avgClientLifetimeMonths: {
    label: 'Průměrná spolupráce',
    icon: <Clock className="w-5 h-5" />,
    getValue: (d) => `${d.avgClientLifetimeMonths} měs.`,
  },
  longestClientMonths: {
    label: 'Nejdelší spolupráce',
    icon: <Award className="w-5 h-5" />,
    getValue: (d) => {
      const years = Math.floor(d.longestClientMonths / 12);
      const months = d.longestClientMonths % 12;
      if (years > 0) return `${years}r ${months}m`;
      return `${months} měs.`;
    },
  },
  avgTrainingsPerWeek: {
    label: 'Tréninků/týden',
    icon: <Calendar className="w-5 h-5" />,
    getValue: (d) => d.avgTrainingsPerWeek.toString(),
    getSubtext: () => 'průměr',
  },
  mostActiveDay: {
    label: 'Nejaktivnější den',
    icon: <Calendar className="w-5 h-5" />,
    getValue: (d) => d.mostActiveDay,
  },
  uniqueExercises: {
    label: 'Unikátních cviků',
    icon: <Dumbbell className="w-5 h-5" />,
    getValue: (d) => d.uniqueExercises.toString(),
  },
};

const THEME_STYLES: Record<ExportTheme, { bg: string; text: string; accent: string; border: string }> = {
  dark: {
    bg: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900',
    text: 'text-white',
    accent: 'text-primary',
    border: 'border-zinc-700',
  },
  light: {
    bg: 'bg-gradient-to-br from-white via-zinc-50 to-white',
    text: 'text-zinc-900',
    accent: 'text-primary',
    border: 'border-zinc-200',
  },
  gradient: {
    bg: 'bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20',
    text: 'text-foreground',
    accent: 'text-primary',
    border: 'border-primary/20',
  },
};

const FORMAT_ASPECT: Record<ExportFormat, string> = {
  'instagram-post': 'aspect-square',
  'instagram-story': 'aspect-[9/16]',
  'facebook': 'aspect-[1200/630]',
  'twitter': 'aspect-[16/9]',
};

export const SocialCardPreview = forwardRef<HTMLDivElement, SocialCardPreviewProps>(
  function SocialCardPreview({ data, selectedMetrics, settings, isLoading }, ref) {
    const theme = THEME_STYLES[settings.theme];
    const aspectClass = FORMAT_ASPECT[settings.format];

    const getPeriodLabel = () => {
      switch (settings.period) {
        case 'month': return new Date().toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
        case 'year': return new Date().getFullYear().toString();
        case 'all': return 'Celá kariéra';
        default: return '';
      }
    };

    if (isLoading || !data) {
      return (
        <div 
          className={cn(
            "w-full max-w-md mx-auto rounded-2xl overflow-hidden",
            aspectClass,
            "bg-muted animate-pulse flex items-center justify-center"
          )}
        >
          <span className="text-muted-foreground">Načítání...</span>
        </div>
      );
    }

    const metricsToShow = selectedMetrics.filter(m => METRIC_CONFIG[m]);

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-md mx-auto rounded-2xl overflow-hidden p-6",
          aspectClass,
          theme.bg,
          theme.text,
          "flex flex-col justify-between"
        )}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <p className={cn("text-sm font-medium opacity-70 uppercase tracking-wider", theme.accent)}>
            {getPeriodLabel()}
          </p>
          <h2 className="text-2xl font-bold mt-1">Statistiky</h2>
        </div>

        {/* Metrics Grid */}
        <div className={cn(
          "flex-1 grid gap-4",
          metricsToShow.length <= 2 ? "grid-cols-1" : 
          metricsToShow.length <= 4 ? "grid-cols-2" : 
          "grid-cols-2"
        )}>
          {metricsToShow.slice(0, 6).map((metricId) => {
            const config = METRIC_CONFIG[metricId];
            if (!config) return null;

            const value = config.getValue(data);
            const subtext = config.getSubtext?.(data);

            return (
              <div 
                key={metricId}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl",
                  "bg-black/10 dark:bg-white/5 backdrop-blur-sm",
                  theme.border,
                  "border"
                )}
              >
                <div className={cn("mb-2 opacity-70", theme.accent)}>
                  {config.icon}
                </div>
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm opacity-70">{config.label}</p>
                {subtext && (
                  <p className="text-xs opacity-50 mt-0.5">{subtext}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer / Branding */}
        <div className="mt-4 pt-4 border-t border-current/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.showLogo && (
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", theme.accent, "bg-current/10")}>
                <Dumbbell className="w-4 h-4" />
              </div>
            )}
            {settings.showTrainerName && settings.trainerName && (
              <span className="font-semibold text-sm">{settings.trainerName}</span>
            )}
          </div>
          {settings.showSocialHandle && settings.socialHandle && (
            <span className="text-sm opacity-70">@{settings.socialHandle}</span>
          )}
        </div>
      </div>
    );
  }
);
