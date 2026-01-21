import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Clock } from 'lucide-react';
import type { ExportFormat, ExportTheme, ExportSettings } from '@/types/socialExport';
import type { LeaderboardEntry, AgeFilter } from '@/hooks/useExerciseLeaderboardExport';

interface LeaderboardCardPreviewProps {
  data: {
    exerciseName: string;
    unit: string;
    maleEntries: LeaderboardEntry[];
    femaleEntries: LeaderboardEntry[];
  } | null | undefined;
  displayMode: 'both' | 'male' | 'female';
  settings: ExportSettings;
  isLoading?: boolean;
  ageFilter: AgeFilter;
}

const THEME_STYLES: Record<ExportTheme, { 
  bg: string; 
  text: string; 
  accent: string; 
  maleAccent: string;
  femaleAccent: string;
  cardBg: string;
}> = {
  dark: {
    bg: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900',
    text: 'text-white',
    accent: 'text-primary',
    maleAccent: 'text-blue-400',
    femaleAccent: 'text-pink-400',
    cardBg: 'bg-white/5',
  },
  light: {
    bg: 'bg-gradient-to-br from-white via-zinc-50 to-white',
    text: 'text-zinc-900',
    accent: 'text-primary',
    maleAccent: 'text-blue-600',
    femaleAccent: 'text-pink-600',
    cardBg: 'bg-zinc-100',
  },
  gradient: {
    bg: 'bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20',
    text: 'text-foreground',
    accent: 'text-primary',
    maleAccent: 'text-blue-500',
    femaleAccent: 'text-pink-500',
    cardBg: 'bg-black/5',
  },
};

const FORMAT_ASPECT: Record<ExportFormat, string> = {
  'instagram-post': 'aspect-square',
  'instagram-story': 'aspect-[9/16]',
  'facebook': 'aspect-[1200/630]',
  'twitter': 'aspect-[16/9]',
};

const AGE_LABELS: Record<AgeFilter, string> = {
  'all': '',
  'under30': 'Do 30 let',
  '30-40': '30-40 let',
  '40-50': '40-50 let',
  'over50': 'Nad 50 let',
};

function LeaderboardTable({ 
  entries, 
  title, 
  accentClass,
  theme,
  maxEntries = 10,
}: { 
  entries: LeaderboardEntry[];
  title: string;
  accentClass: string;
  theme: typeof THEME_STYLES.dark;
  maxEntries?: number;
}) {
  const displayEntries = entries.slice(0, maxEntries);
  
  if (displayEntries.length === 0) {
    return (
      <div className={cn("flex-1 rounded-xl p-4", theme.cardBg)}>
        <h3 className={cn("text-lg font-bold mb-3 text-center", accentClass)}>
          {title}
        </h3>
        <p className="text-center text-sm opacity-50">Žádná data</p>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 rounded-xl p-4", theme.cardBg)}>
      <h3 className={cn("text-lg font-bold mb-3 text-center", accentClass)}>
        {title}
      </h3>
      <div className="space-y-1.5">
        {displayEntries.map((entry, idx) => (
          <div 
            key={entry.clientId}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm",
              idx === 0 && "bg-yellow-500/20",
              idx === 1 && "bg-gray-400/20",
              idx === 2 && "bg-orange-600/20"
            )}
          >
            <span className={cn(
              "w-6 text-center font-bold",
              idx === 0 && "text-yellow-500",
              idx === 1 && "text-gray-400",
              idx === 2 && "text-orange-500"
            )}>
              {entry.rank}.
            </span>
            <span className="flex-1 truncate font-medium">
              {entry.clientName}
            </span>
            <span className={cn("font-bold tabular-nums", accentClass)}>
              {entry.displayValue}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const LeaderboardCardPreview = forwardRef<HTMLDivElement, LeaderboardCardPreviewProps>(
  function LeaderboardCardPreview({ data, displayMode, settings, isLoading, ageFilter }, ref) {
    const theme = THEME_STYLES[settings.theme];
    const aspectClass = FORMAT_ASPECT[settings.format];

    if (isLoading) {
      return (
        <div 
          className={cn(
            "w-full max-w-lg mx-auto rounded-2xl overflow-hidden",
            aspectClass,
            "bg-muted animate-pulse flex items-center justify-center"
          )}
        >
          <span className="text-muted-foreground">Načítání...</span>
        </div>
      );
    }

    if (!data) {
      return (
        <div 
          className={cn(
            "w-full max-w-lg mx-auto rounded-2xl overflow-hidden",
            aspectClass,
            "bg-muted flex items-center justify-center"
          )}
        >
          <span className="text-muted-foreground">Vyberte cvik</span>
        </div>
      );
    }

    const showMale = displayMode === 'both' || displayMode === 'male';
    const showFemale = displayMode === 'both' || displayMode === 'female';
    const isTimeBasedExercise = data.unit === 'čas';

    // Determine max entries based on format
    const maxEntries = settings.format === 'instagram-story' ? 15 : 10;

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-lg mx-auto rounded-2xl overflow-hidden p-6",
          aspectClass,
          theme.bg,
          theme.text,
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {isTimeBasedExercise ? (
              <Clock className={cn("w-6 h-6", theme.accent)} />
            ) : (
              <Trophy className={cn("w-6 h-6", theme.accent)} />
            )}
          </div>
          <h2 className="text-2xl font-bold">{data.exerciseName}</h2>
          {ageFilter !== 'all' && (
            <p className={cn("text-sm mt-1 opacity-70", theme.accent)}>
              {AGE_LABELS[ageFilter]}
            </p>
          )}
        </div>

        {/* Leaderboard Tables */}
        <div className={cn(
          "flex-1 flex gap-4",
          displayMode !== 'both' && "justify-center"
        )}>
          {showMale && (
            <LeaderboardTable
              entries={data.maleEntries}
              title="👨 Muži"
              accentClass={theme.maleAccent}
              theme={theme}
              maxEntries={maxEntries}
            />
          )}
          {showFemale && (
            <LeaderboardTable
              entries={data.femaleEntries}
              title="👩 Ženy"
              accentClass={theme.femaleAccent}
              theme={theme}
              maxEntries={maxEntries}
            />
          )}
        </div>

        {/* Footer / Branding */}
        <div className="mt-4 pt-4 border-t border-current/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings.showLogo && (
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center", 
                theme.accent, 
                "bg-current/10"
              )}>
                <Trophy className="w-4 h-4" />
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
