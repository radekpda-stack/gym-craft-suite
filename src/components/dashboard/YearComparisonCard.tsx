import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CalendarRange, TrendingUp, TrendingDown, Users, Dumbbell, Banknote } from 'lucide-react';
import { useYearOverYearStats } from '@/hooks/useYearOverYearStats';
import { cn } from '@/lib/utils';

type ViewMode = 'overview' | 'chart';

export function YearComparisonCard() {
  const { data, isLoading } = useYearOverYearStats();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  const StatCard = ({ 
    label, 
    current, 
    last, 
    percentChange, 
    icon: Icon, 
    isCurrency = false 
  }: { 
    label: string; 
    current: number; 
    last: number; 
    percentChange: number; 
    icon: React.ElementType;
    isCurrency?: boolean;
  }) => (
    <div className="p-3 rounded-xl bg-secondary/30 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-lg font-bold text-foreground">
            {isCurrency ? `${current.toLocaleString('cs-CZ')} Kč` : current}
          </p>
          <p className="text-xs text-muted-foreground">
            vs {isCurrency ? `${last.toLocaleString('cs-CZ')} Kč` : last} ({lastYear})
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
          percentChange > 0 && 'bg-success/10 text-success',
          percentChange < 0 && 'bg-destructive/10 text-destructive',
          percentChange === 0 && 'bg-muted text-muted-foreground'
        )}>
          {percentChange > 0 ? <TrendingUp className="w-3 h-3" /> : percentChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          {percentChange > 0 ? '+' : ''}{percentChange}%
        </div>
      </div>
    </div>
  );

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Rok vs rok ({currentYear} vs {lastYear})
          </CardTitle>
          <div className="flex gap-1 p-0.5 rounded-full bg-secondary/50">
            <Button
              variant={viewMode === 'overview' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full text-xs px-3 h-6"
              onClick={() => setViewMode('overview')}
            >
              Přehled
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full text-xs px-3 h-6"
              onClick={() => setViewMode('chart')}
            >
              Graf
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'overview' ? (
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="Tréninky"
              current={data.trainings.currentYear}
              last={data.trainings.lastYear}
              percentChange={data.trainings.percentChange}
              icon={Dumbbell}
            />
            <StatCard
              label="Příjmy"
              current={data.income.currentYear}
              last={data.income.lastYear}
              percentChange={data.income.percentChange}
              icon={Banknote}
              isCurrency
            />
            <StatCard
              label="Noví klienti"
              current={data.newClients.currentYear}
              last={data.newClients.lastYear}
              percentChange={data.newClients.percentChange}
              icon={Users}
            />
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                <Bar dataKey="currentYear" name={String(currentYear)} fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="lastYear" name={String(lastYear)} fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
