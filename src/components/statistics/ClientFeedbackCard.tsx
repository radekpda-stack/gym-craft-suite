import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Heart, Sparkles, Moon, Zap, AlertTriangle, BedDouble } from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface ClientFeedbackCardProps {
  stats?: AnnualStatsData | null;
}

function MetricRow({ icon: Icon, label, value, max, unit }: {
  icon: React.ElementType;
  label: string;
  value: number;
  max: number;
  unit?: string;
}) {
  if (value === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground truncate">{label}</span>
          <span className="text-sm font-semibold tabular-nums">
            {value.toFixed(1)}{unit ? ` ${unit}` : `/${max}`}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary/60 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ClientFeedbackCard({ stats }: ClientFeedbackCardProps) {
  const totalFeedback = stats?.totalFeedback || 0;

  if (totalFeedback === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            Zpětná vazba klientů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná zpětná vazba
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4 text-primary" />
          Zpětná vazba klientů
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            {totalFeedback} odpovědí
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetricRow icon={Heart} label="Pocit těla" value={stats?.avgBodyFeel || 0} max={10} />
        <MetricRow icon={Sparkles} label="Session fit" value={stats?.avgSessionFit || 0} max={10} />
        <MetricRow icon={Zap} label="Energie" value={stats?.avgEnergyRating || 0} max={10} />
        <MetricRow icon={Moon} label="Kvalita spánku" value={stats?.avgSleepQuality || 0} max={10} />
        <MetricRow icon={BedDouble} label="Ø spánek" value={stats?.avgSleepHours || 0} max={10} unit="h" />
        
        {(stats?.redFlagCount || 0) > 0 && (
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Red flagy</span>
            <span className="text-sm font-semibold tabular-nums ml-auto">{stats?.redFlagCount}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
