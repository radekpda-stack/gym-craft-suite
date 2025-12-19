import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, CalendarX, Clock, TrendingUp } from 'lucide-react';
import { useClientAttendanceStats } from '@/hooks/useClientAttendanceStats';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientAttendanceStatsProps {
  clientId: string;
}

export function ClientAttendanceStats({ clientId }: ClientAttendanceStatsProps) {
  const { stats, isLoading } = useClientAttendanceStats(clientId);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-[180px]" />
        </CardContent>
      </Card>
    );
  }

  if (stats.totalTrainings === 0) {
    return (
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Statistika docházky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Zatím žádné tréninky pro výpočet statistik
          </p>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      label: 'Docházka',
      value: `${stats.attendancePercentage}%`,
      subValue: `${stats.completedCount} tréninků`,
      icon: CalendarCheck,
      color: stats.attendancePercentage >= 80 
        ? 'text-emerald-500' 
        : stats.attendancePercentage >= 60 
          ? 'text-amber-500' 
          : 'text-destructive',
      bgColor: stats.attendancePercentage >= 80 
        ? 'bg-emerald-500/10' 
        : stats.attendancePercentage >= 60 
          ? 'bg-amber-500/10' 
          : 'bg-destructive/10',
    },
    {
      label: 'Zrušeno',
      value: `${stats.canceledPercentage}%`,
      subValue: `${stats.canceledCount} tréninků`,
      icon: CalendarX,
      color: stats.canceledPercentage <= 10 
        ? 'text-emerald-500' 
        : stats.canceledPercentage <= 25 
          ? 'text-amber-500' 
          : 'text-destructive',
      bgColor: stats.canceledPercentage <= 10 
        ? 'bg-emerald-500/10' 
        : stats.canceledPercentage <= 25 
          ? 'bg-amber-500/10' 
          : 'bg-destructive/10',
    },
    {
      label: 'Pozdní zrušení',
      value: `${stats.lateCancellationPercentage}%`,
      subValue: `${stats.lateCancellationCount} z ${stats.canceledCount}`,
      icon: Clock,
      color: stats.lateCancellationPercentage <= 20 
        ? 'text-emerald-500' 
        : stats.lateCancellationPercentage <= 50 
          ? 'text-amber-500' 
          : 'text-destructive',
      bgColor: stats.lateCancellationPercentage <= 20 
        ? 'bg-emerald-500/10' 
        : stats.lateCancellationPercentage <= 50 
          ? 'bg-amber-500/10' 
          : 'bg-destructive/10',
    },
  ];

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Statistika docházky
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {statItems.map((item) => (
            <div 
              key={item.label}
              className={`rounded-lg p-3 ${item.bgColor} transition-colors`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              <div className={`text-xl font-bold ${item.color}`}>
                {item.value}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {item.subValue}
              </div>
            </div>
          ))}
        </div>

        {/* Attendance Chart */}
        {stats.monthlyData.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Návštěvnost za posledních 6 měsíců</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyData} barGap={0}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar 
                    dataKey="completed" 
                    name="Dokončeno" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="canceled" 
                    name="Zrušeno" 
                    fill="hsl(var(--muted-foreground))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="lateCanceled" 
                    name="Pozdě zrušeno" 
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
