import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePortalRecentActivity } from '@/hooks/useClientPortalAdmin';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Activity, 
  LogIn, 
  Eye, 
  FileText, 
  CreditCard, 
  Scale, 
  Percent, 
  Timer, 
  Dumbbell, 
  Target, 
  KeyRound, 
  User,
  Trophy,
  Award,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  // Login
  login: LogIn,
  portal_login: LogIn,
  
  // Page views
  page_view: Eye,
  page_mount: Eye,
  
  // Measurements
  measurement_weight_added: Scale,
  measurement_bodyfat_added: Percent,
  
  // Cardio
  cardio_entry_added: Timer,
  cardio_time_added: Timer,
  
  // Workouts
  workout_logged: Dumbbell,
  exercise_added: Dumbbell,
  performance_reported: Target,
  
  // Profile
  credentials_changed: KeyRound,
  profile_updated: User,
  
  // Challenges
  challenge_joined: Trophy,
  challenge_submitted: Award,
  
  // Badges/Gamification
  badge_earned: Award,
  level_up: Zap,
  
  // Other
  form_submit: FileText,
  credit_view: CreditCard,
  pr_achieved: Zap,
  
  default: Activity,
};

const ACTIVITY_LABELS: Record<string, string> = {
  // Login
  login: 'Přihlášení',
  portal_login: 'Přihlášení do portálu',
  
  // Page views
  page_view: 'Zobrazení stránky',
  page_mount: 'Návštěva stránky',
  
  // Measurements
  measurement_weight_added: 'Přidal/a váhu',
  measurement_bodyfat_added: 'Přidal/a tělesný tuk',
  
  // Cardio
  cardio_entry_added: 'Přidal/a kardio záznam',
  cardio_time_added: 'Zapsal/a kardio čas',
  
  // Workouts
  workout_logged: 'Zaznamenal/a trénink',
  exercise_added: 'Přidal/a cvik',
  performance_reported: 'Nahlásil/a výkon',
  
  // Profile
  credentials_changed: 'Změnil/a přihlašovací údaje',
  profile_updated: 'Aktualizoval/a profil',
  
  // Challenges
  challenge_joined: 'Zapojil/a se do výzvy',
  challenge_submitted: 'Odeslal/a výsledek výzvy',
  
  // Badges/Gamification
  badge_earned: 'Získal/a odznak',
  level_up: 'Dosáhl/a nové úrovně',
  
  // Other
  form_submit: 'Odeslání formuláře',
  credit_view: 'Zobrazení kreditu',
  pr_achieved: 'Dosáhl/a osobního rekordu',
};

// Color coding for different activity types
const ACTIVITY_COLORS: Record<string, string> = {
  // Green - positive actions (adding data, achievements)
  measurement_weight_added: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  measurement_bodyfat_added: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  cardio_entry_added: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  cardio_time_added: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  workout_logged: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  exercise_added: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  performance_reported: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  pr_achieved: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  
  // Blue - navigation/viewing
  login: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  portal_login: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  page_view: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  page_mount: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  
  // Yellow/orange - profile changes
  credentials_changed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  profile_updated: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  
  // Purple - challenges & badges
  challenge_joined: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  challenge_submitted: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  badge_earned: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  level_up: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  
  default: 'bg-primary/10 text-primary',
};

// Format metadata details for display
function getActivityDetail(activityType: string, metadata: Record<string, any> | null): string | null {
  if (!metadata) return null;

  switch (activityType) {
    case 'measurement_weight_added':
      return metadata.value ? `${metadata.value} ${metadata.unit || 'kg'}` : null;
    case 'measurement_bodyfat_added':
      return metadata.value ? `${metadata.value}${metadata.unit || '%'}` : null;
    case 'cardio_entry_added':
    case 'cardio_time_added':
      const parts = [];
      if (metadata.exercise_name) parts.push(metadata.exercise_name);
      if (metadata.distance_display) parts.push(metadata.distance_display);
      if (metadata.time_display) parts.push(metadata.time_display);
      if (metadata.is_pr) parts.push('🏆 PR!');
      return parts.length > 0 ? parts.join(' • ') : null;
    case 'performance_reported':
      return metadata.exercise_name || null;
    case 'challenge_joined':
    case 'challenge_submitted':
      return metadata.challenge_title || null;
    case 'badge_earned':
      const badgeParts = [];
      if (metadata.badge_name) badgeParts.push(metadata.badge_name);
      if (metadata.badge_rarity) badgeParts.push(`(${metadata.badge_rarity})`);
      return badgeParts.length > 0 ? badgeParts.join(' ') : null;
    case 'level_up':
      return metadata.new_level ? `Level ${metadata.new_level}` : null;
    case 'credentials_changed':
      const changes = [];
      if (metadata.email_changed) changes.push('email');
      if (metadata.password_changed) changes.push('heslo');
      return changes.length > 0 ? `Změněno: ${changes.join(', ')}` : null;
    case 'page_view':
    case 'page_mount':
      return metadata.page || null;
    default:
      return null;
  }
}

export function PortalRecentActivity() {
  const { data: activities, isLoading } = usePortalRecentActivity(20);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Poslední aktivita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-20" />
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
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Poslední aktivita
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Zatím žádná aktivita</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-3">
              {activities?.map((activity: any) => {
                const Icon = ACTIVITY_ICONS[activity.activity_type] || ACTIVITY_ICONS.default;
                const label = ACTIVITY_LABELS[activity.activity_type] || activity.activity_type;
                const colorClass = ACTIVITY_COLORS[activity.activity_type] || ACTIVITY_COLORS.default;
                const detail = getActivityDetail(activity.activity_type, activity.metadata);
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      colorClass
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.client?.name || 'Neznámý klient'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {label}
                        {detail && (
                          <span className="ml-1 text-foreground/70">
                            — {detail}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(activity.created_at || activity.activity_date), {
                        addSuffix: true,
                        locale: cs,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
