import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  type: 'number' | 'integer' | 'time';
  required: boolean;
  min?: number;
  max?: number;
  order: number;
}

export interface LeaderboardConfig {
  primary_metric_key: string;
  direction: 'max' | 'min';
  tie_breakers: string[];
}

interface MultiMetricConfigProps {
  metrics: MetricConfig[];
  leaderboardConfig: LeaderboardConfig;
  onMetricsChange: (metrics: MetricConfig[]) => void;
  onLeaderboardConfigChange: (config: LeaderboardConfig) => void;
}

const METRIC_TYPES = [
  { value: 'integer', label: 'Celé číslo (1, 2, 3...)' },
  { value: 'number', label: 'Desetinné číslo (1.5, 2.25...)' },
  { value: 'time', label: 'Čas (mm:ss)' },
];

const COMMON_UNITS = [
  { value: 'reps', label: 'opakování' },
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'km', label: 'km' },
  { value: 'cal', label: 'kcal' },
  { value: 'min', label: 'min' },
  { value: 's', label: 's' },
  { value: '%', label: '%' },
  { value: 'custom', label: 'vlastní...' },
];

export function MultiMetricConfig({
  metrics,
  leaderboardConfig,
  onMetricsChange,
  onLeaderboardConfigChange,
}: MultiMetricConfigProps) {
  const [customUnits, setCustomUnits] = useState<Record<string, string>>({});

  const addMetric = () => {
    const newMetric: MetricConfig = {
      key: `metric_${Date.now()}`,
      label: '',
      unit: 'reps',
      type: 'integer',
      required: true,
      order: metrics.length,
    };
    onMetricsChange([...metrics, newMetric]);
  };

  const updateMetric = (index: number, updates: Partial<MetricConfig>) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], ...updates };
    onMetricsChange(updated);
  };

  const removeMetric = (index: number) => {
    const updated = metrics.filter((_, i) => i !== index);
    // Reorder
    updated.forEach((m, i) => (m.order = i));
    onMetricsChange(updated);

    // Update leaderboard config if primary was removed
    if (leaderboardConfig.primary_metric_key === metrics[index].key) {
      onLeaderboardConfigChange({
        ...leaderboardConfig,
        primary_metric_key: updated[0]?.key || '',
        tie_breakers: leaderboardConfig.tie_breakers.filter(k => k !== metrics[index].key),
      });
    }
  };

  const moveMetric = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === metrics.length - 1)
    ) return;

    const updated = [...metrics];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    updated.forEach((m, i) => (m.order = i));
    onMetricsChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Metriky hodnocení</Label>
        <Button type="button" variant="outline" size="sm" onClick={addMetric}>
          <Plus className="h-4 w-4 mr-1" />
          Přidat metriku
        </Button>
      </div>

      {metrics.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">Zatím žádné metriky</p>
          <p className="text-xs mt-1">Přidejte alespoň jednu metriku pro hodnocení výsledků</p>
        </div>
      )}

      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <Card key={metric.key} className="relative">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center gap-1 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveMetric(index, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveMetric(index, 'down')}
                    disabled={index === metrics.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs">Název metriky *</Label>
                    <Input
                      value={metric.label}
                      onChange={(e) => updateMetric(index, { label: e.target.value })}
                      placeholder="např. Počet opakování"
                      className="mt-1 h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Typ hodnoty</Label>
                    <Select
                      value={metric.type}
                      onValueChange={(v) => updateMetric(index, { type: v as any })}
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Jednotka</Label>
                    <Select
                      value={customUnits[metric.key] ? 'custom' : metric.unit}
                      onValueChange={(v) => {
                        if (v === 'custom') {
                          setCustomUnits({ ...customUnits, [metric.key]: metric.unit });
                        } else {
                          const { [metric.key]: _, ...rest } = customUnits;
                          setCustomUnits(rest);
                          updateMetric(index, { unit: v });
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_UNITS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {customUnits[metric.key] !== undefined && (
                    <div>
                      <Label className="text-xs">Vlastní jednotka</Label>
                      <Input
                        value={metric.unit}
                        onChange={(e) => updateMetric(index, { unit: e.target.value })}
                        placeholder="např. km/h"
                        className="mt-1 h-9"
                      />
                    </div>
                  )}

                  <div className="col-span-2 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={metric.required}
                        onCheckedChange={(v) => updateMetric(index, { required: v })}
                      />
                      <Label className="text-xs">Povinné</Label>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeMetric(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {metrics.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-4">
            <Label className="text-sm font-medium">Nastavení žebříčku</Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Hlavní metrika pro řazení</Label>
                <Select
                  value={leaderboardConfig.primary_metric_key}
                  onValueChange={(v) =>
                    onLeaderboardConfigChange({ ...leaderboardConfig, primary_metric_key: v })
                  }
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Vyberte metriku..." />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.label || `Metrika ${m.order + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Směr řazení</Label>
                <Select
                  value={leaderboardConfig.direction}
                  onValueChange={(v) =>
                    onLeaderboardConfigChange({ ...leaderboardConfig, direction: v as 'max' | 'min' })
                  }
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="max">Více = lepší (↑)</SelectItem>
                    <SelectItem value="min">Méně = lepší (↓)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
