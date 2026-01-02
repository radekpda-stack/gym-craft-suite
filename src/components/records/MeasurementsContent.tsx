import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Plus, Download, Activity, Scale, Percent, Flame, FileUp, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';
import { useMeasurements, useCreateMeasurement } from '@/hooks/useMeasurements';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { PDFImportDialog } from '@/components/measurements/PDFImportDialog';
import { cn } from '@/lib/utils';
import { exportMeasurementsToCSV, exportMeasurementsToXLSX, exportMeasurementsWithTrendsToPDF } from '@/lib/measurementExport';
import { toast } from '@/hooks/use-toast';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';

export default function MeasurementsContent() {
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const effectiveClientId = selectedClientId || clients[0]?.id || '';
  const { data: measurements = [] } = useMeasurements(effectiveClientId);
  const createMeasurement = useCreateMeasurement();

  const selectedClient = clients.find((c) => c.id === effectiveClientId);

  const chartData = measurements.map((m) => ({
    date: format(new Date(m.date), 'd.M.', { locale: cs }),
    fullDate: format(new Date(m.date), 'd. MMMM yyyy', { locale: cs }),
    weight: m.weight,
    bodyFat: m.body_fat_percentage,
    muscle: m.muscle_mass,
    metabolism: m.basal_metabolism,
  }));

  const latestMeasurement = measurements[0];
  const previousMeasurement = measurements[1];

  const getChange = (current?: number | null, previous?: number | null) => {
    if (!current || !previous) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const handleCreateMeasurement = async (data: any): Promise<string | void> => {
    const result = await createMeasurement.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      weight: data.weight,
      body_fat_percentage: data.body_fat_percentage,
      muscle_mass: data.muscle_mass,
      basal_metabolism: data.basal_metabolism,
      chest: data.chest,
      waist: data.waist,
      hips: data.hips,
      bicep_left: data.bicep_left,
      bicep_right: data.bicep_right,
      thigh_left: data.thigh_left,
      thigh_right: data.thigh_right,
      calf_left: data.calf_left,
      calf_right: data.calf_right,
      mental_state: data.mental_state,
      notes: data.notes,
    });
    setIsCreateOpen(false);
    return result?.id;
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
      value: latestMeasurement?.body_fat_percentage,
      unit: '%',
      change: getChange(latestMeasurement?.body_fat_percentage, previousMeasurement?.body_fat_percentage),
      icon: Percent,
      positive: false,
    },
    {
      label: 'Svalová hmota',
      value: latestMeasurement?.muscle_mass,
      unit: 'kg',
      change: getChange(latestMeasurement?.muscle_mass, previousMeasurement?.muscle_mass),
      icon: Activity,
      positive: true,
    },
    {
      label: 'Bazální metabolismus',
      value: latestMeasurement?.basal_metabolism,
      unit: 'kcal',
      change: getChange(latestMeasurement?.basal_metabolism, previousMeasurement?.basal_metabolism),
      icon: Flame,
      positive: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => setIsImportOpen(true)}
        >
          <FileUp className="w-4 h-4" />
          <span className="hidden sm:inline">Import (PDF / Foto)</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2"
              disabled={!selectedClient || measurements.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              if (selectedClient) {
                exportMeasurementsWithTrendsToPDF(selectedClient.name, measurements);
                toast({ title: "PDF exportováno" });
              }
            }}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (selectedClient) {
                exportMeasurementsToCSV(selectedClient.name, measurements);
                toast({ title: "CSV exportováno" });
              }
            }}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (selectedClient) {
                exportMeasurementsToXLSX(selectedClient.name, measurements);
                toast({ title: "XLSX exportováno" });
              }
            }}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export XLSX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nové měření</span>
        </Button>
      </div>

      <CreateMeasurementSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateMeasurement}
        isLoading={createMeasurement.isPending}
        clients={clients}
        defaultClientId={effectiveClientId}
      />

      <PDFImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />

      {/* Client & Time Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <ClientSearchSelect
          clients={clients.filter(c => !c.is_archived)}
          value={effectiveClientId}
          onValueChange={(v) => setSelectedClientId(v || '')}
          placeholder="Vyberte klienta"
          className="w-full sm:w-64"
        />

        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)}
              className="rounded-full h-9 px-4 touch-target flex-shrink-0"
            >
              {range === 'week' ? 'Týden' : range === 'month' ? 'Měsíc' : 'Rok'}
            </Button>
          ))}
        </div>
      </div>

      {/* Compact Stats Row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap glass rounded-xl p-3">
        {stats.map((stat, i) => (
          <span key={stat.label} className="flex items-center gap-1">
            {i > 0 && <span className="mr-3">•</span>}
            <span className="text-muted-foreground">{stat.label}:</span>
            <strong className="text-foreground">{stat.value || '—'}</strong>
            <span className="text-xs">{stat.unit}</span>
            {stat.change && (
              <span className={cn(
                'text-xs ml-1',
                (stat.positive ? parseFloat(stat.change) > 0 : parseFloat(stat.change) < 0)
                  ? 'text-success'
                  : 'text-destructive'
              )}>
                {parseFloat(stat.change) > 0 ? '+' : ''}{stat.change}%
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Weight Chart */}
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
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
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
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
        <div className="glass rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Zatím žádná měření
          </h3>
          <p className="text-muted-foreground mt-1">
            Přidejte první měření pro tohoto klienta
          </p>
          <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>Přidat měření</Button>
        </div>
      )}

      {/* Measurements History */}
      {measurements.length > 0 && (
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Historie měření
          </h3>
          <div className="space-y-3">
            {[...measurements].reverse().map((measurement) => (
              <div
                key={measurement.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(measurement.date), 'd. MMMM yyyy', { locale: cs })}
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
                    <p className="font-semibold text-foreground">{measurement.body_fat_percentage}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Svaly</p>
                    <p className="font-semibold text-foreground">{measurement.muscle_mass} kg</p>
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
