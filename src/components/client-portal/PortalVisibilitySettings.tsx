import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  usePortalVisibilitySettings,
  useUpdatePortalVisibility,
  PortalVisibilitySettings as Settings,
  ProgressMetricsSettings,
} from '@/hooks/useClientPortalAdmin';
import { 
  TrendingUp, Calendar, CreditCard, Utensils, User, 
  ChevronDown, Scale, Percent, Dumbbell, Timer, PersonStanding 
} from 'lucide-react';

type MainSectionKey = 'progress' | 'attendance' | 'credit' | 'nutrition' | 'profile';

const SECTIONS: { key: MainSectionKey; label: string; description: string; icon: typeof TrendingUp }[] = [
  {
    key: 'progress',
    label: 'Pokrok',
    description: 'Sledované cviky a osobní rekordy',
    icon: TrendingUp,
  },
  {
    key: 'attendance',
    label: 'Docházka',
    description: 'Historie tréninků a účast',
    icon: Calendar,
  },
  {
    key: 'credit',
    label: 'Kredit',
    description: 'Stav kreditu a historie transakcí',
    icon: CreditCard,
  },
  {
    key: 'nutrition',
    label: 'Strava',
    description: 'Nutriční kampaně a záznamy',
    icon: Utensils,
  },
  {
    key: 'profile',
    label: 'Profil',
    description: 'Osobní údaje klienta',
    icon: User,
  },
];

const PROGRESS_METRICS: { key: keyof ProgressMetricsSettings; label: string; icon: typeof Scale }[] = [
  { key: 'weight', label: 'Váha', icon: Scale },
  { key: 'bodyFat', label: 'Tělesný tuk', icon: Percent },
  { key: 'trackedExercises', label: 'Sledované cviky', icon: Dumbbell },
  { key: 'rowing500m', label: 'Veslo 500m', icon: Timer },
  { key: 'rowing1000m', label: 'Veslo 1000m', icon: Timer },
  { key: 'running500m', label: 'Běh 500m', icon: PersonStanding },
  { key: 'running1000m', label: 'Běh 1000m', icon: PersonStanding },
];

export function PortalVisibilitySettings() {
  const { data: settings, isLoading } = usePortalVisibilitySettings();
  const updateVisibility = useUpdatePortalVisibility();
  const [progressOpen, setProgressOpen] = useState(false);

  const handleToggle = (key: MainSectionKey) => {
    if (!settings) return;
    
    updateVisibility.mutate({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleProgressMetricToggle = (key: keyof ProgressMetricsSettings) => {
    if (!settings) return;
    
    const currentMetrics = settings.progressMetrics || {
      weight: true,
      bodyFat: true,
      trackedExercises: true,
      rowing500m: true,
      rowing1000m: true,
      running500m: true,
      running1000m: true,
    };
    
    updateVisibility.mutate({
      ...settings,
      progressMetrics: {
        ...currentMetrics,
        [key]: !currentMetrics[key],
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Viditelnost sekcí</CardTitle>
          <CardDescription>Nastavte, které sekce klienti uvidí v portálu.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-6 w-11" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressMetrics = settings?.progressMetrics || {
    weight: true,
    bodyFat: true,
    trackedExercises: true,
    rowing500m: true,
    rowing1000m: true,
    running500m: true,
    running1000m: true,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Viditelnost sekcí</CardTitle>
        <CardDescription>
          Nastavte, které sekce klienti uvidí v portálu. Toto platí pro všechny klienty.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isEnabled = settings?.[section.key] ?? true;
            
            if (section.key === 'progress') {
              return (
                <Collapsible key={section.key} open={progressOpen} onOpenChange={setProgressOpen}>
                  <div className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <Label htmlFor={section.key} className="font-medium">
                            {section.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={section.key}
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(section.key)}
                          disabled={updateVisibility.isPending}
                        />
                        <CollapsibleTrigger asChild>
                          <button className="p-1 rounded hover:bg-muted">
                            <ChevronDown className={`w-4 h-4 transition-transform ${progressOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="border-t px-3 py-2 space-y-2 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">
                          Detailní nastavení viditelnosti progresu:
                        </p>
                        {PROGRESS_METRICS.map((metric) => {
                          const MetricIcon = metric.icon;
                          const isMetricEnabled = progressMetrics[metric.key] ?? true;
                          
                          return (
                            <div
                              key={metric.key}
                              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <MetricIcon className="w-4 h-4 text-muted-foreground" />
                                <Label htmlFor={`metric-${metric.key}`} className="text-sm">
                                  {metric.label}
                                </Label>
                              </div>
                              <Switch
                                id={`metric-${metric.key}`}
                                checked={isMetricEnabled}
                                onCheckedChange={() => handleProgressMetricToggle(metric.key)}
                                disabled={updateVisibility.isPending || !isEnabled}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            }
            
            return (
              <div
                key={section.key}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor={section.key} className="font-medium">
                      {section.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={section.key}
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(section.key)}
                  disabled={updateVisibility.isPending}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
