import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Plus, Download, Activity, TrendingUp, TrendingDown, Scale, Percent, Flame, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { mockClients, mockMeasurements } from '@/data/mockData';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export default function Measurements() {
  const [selectedClientId, setSelectedClientId] = useState<string>(mockClients[0].id);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const selectedClient = mockClients.find((c) => c.id === selectedClientId);
  const clientMeasurements = mockMeasurements.filter((m) => m.clientId === selectedClientId);

  const chartData = clientMeasurements.map((m) => ({
    date: format(m.date, 'd.M.', { locale: cs }),
    fullDate: format(m.date, 'd. MMMM yyyy', { locale: cs }),
    weight: m.weight,
    bodyFat: m.bodyFatPercentage,
    muscle: m.muscleMass,
    metabolism: m.basalMetabolism,
  }));

  const latestMeasurement = clientMeasurements[clientMeasurements.length - 1];
  const previousMeasurement = clientMeasurements[clientMeasurements.length - 2];

  const getChange = (current?: number, previous?: number) => {
    if (!current || !previous) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const stats = [
    {
      label: 'Váha',
      value: latestMeasurement?.weight,
      unit: 'kg',
      change: getChange(latestMeasurement?.weight, previousMeasurement?.weight),
      icon: Scale,
      positive: false,
    },
    {
      label: 'Tělesný tuk',
      value: latestMeasurement?.bodyFatPercentage,
      unit: '%',
      change: getChange(latestMeasurement?.bodyFatPercentage, previousMeasurement?.bodyFatPercentage),
      icon: Percent,
      positive: false,
    },
    {
      label: 'Svalová hmota',
      value: latestMeasurement?.muscleMass,
      unit: 'kg',
      change: getChange(latestMeasurement?.muscleMass, previousMeasurement?.muscleMass),
      icon: Activity,
      positive: true,
    },
    {
      label: 'Bazální metabolismus',
      value: latestMeasurement?.basalMetabolism,
      unit: 'kcal',
      change: getChange(latestMeasurement?.basalMetabolism, previousMeasurement?.basalMetabolism),
      icon: Flame,
      positive: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Měření a grafy
          </h1>
          <p className="text-muted-foreground mt-1">
            Sledujte pokroky vašich klientů
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nové měření
          </Button>
        </div>
      </div>

      {/* Client & Time Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-full sm:w-64 h-12 bg-secondary border-border rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mockClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                <div className="flex items-center gap-2">
                  <ClientAvatar name={client.name} size="sm" />
                  <span>{client.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)}
              className="rounded-xl"
            >
              {range === 'week' ? 'Týden' : range === 'month' ? 'Měsíc' : 'Rok'}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-foreground tracking-tight">
                {stat.value || '—'}
              </span>
              <span className="text-xl text-muted-foreground mb-1">
                {stat.unit}
              </span>
            </div>
            {stat.change && (
              <div className={cn(
                'flex items-center gap-1 mt-2 text-sm font-medium',
                (stat.positive ? parseFloat(stat.change) > 0 : parseFloat(stat.change) < 0)
                  ? 'text-success'
                  : 'text-destructive'
              )}>
                {parseFloat(stat.change) > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{stat.change}%</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weight Chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Vývoj hmotnosti
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#weightGradient)"
                    name="Váha (kg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Body Composition Chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Tělesné složení
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bodyFat"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--warning))' }}
                    name="Tělesný tuk (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="muscle"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--success))' }}
                    name="Svalová hmota (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Zatím žádná měření
          </h3>
          <p className="text-muted-foreground mt-1">
            Přidejte první měření pro tohoto klienta
          </p>
          <Button className="mt-4">Přidat měření</Button>
        </div>
      )}

      {/* Measurements History */}
      {clientMeasurements.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Historie měření
          </h3>
          <div className="space-y-3">
            {clientMeasurements.reverse().map((measurement) => (
              <div
                key={measurement.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {format(measurement.date, 'd. MMMM yyyy', { locale: cs })}
                  </p>
                  {measurement.notes && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {measurement.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-muted-foreground">Váha</p>
                    <p className="font-semibold text-foreground">{measurement.weight} kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Tuk</p>
                    <p className="font-semibold text-foreground">{measurement.bodyFatPercentage}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Svaly</p>
                    <p className="font-semibold text-foreground">{measurement.muscleMass} kg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
