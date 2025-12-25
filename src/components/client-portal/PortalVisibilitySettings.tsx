import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePortalVisibilitySettings,
  useUpdatePortalVisibility,
  PortalVisibilitySettings as Settings,
} from '@/hooks/useClientPortalAdmin';
import { TrendingUp, Calendar, CreditCard, Utensils, User } from 'lucide-react';

const SECTIONS = [
  {
    key: 'progress' as keyof Settings,
    label: 'Pokrok',
    description: 'Sledované cviky a osobní rekordy',
    icon: TrendingUp,
  },
  {
    key: 'attendance' as keyof Settings,
    label: 'Docházka',
    description: 'Historie tréninků a účast',
    icon: Calendar,
  },
  {
    key: 'credit' as keyof Settings,
    label: 'Kredit',
    description: 'Stav kreditu a historie transakcí',
    icon: CreditCard,
  },
  {
    key: 'nutrition' as keyof Settings,
    label: 'Strava',
    description: 'Nutriční kampaně a záznamy',
    icon: Utensils,
  },
  {
    key: 'profile' as keyof Settings,
    label: 'Profil',
    description: 'Osobní údaje klienta',
    icon: User,
  },
];

export function PortalVisibilitySettings() {
  const { data: settings, isLoading } = usePortalVisibilitySettings();
  const updateVisibility = useUpdatePortalVisibility();

  const handleToggle = (key: keyof Settings) => {
    if (!settings) return;
    
    updateVisibility.mutate({
      ...settings,
      [key]: !settings[key],
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
