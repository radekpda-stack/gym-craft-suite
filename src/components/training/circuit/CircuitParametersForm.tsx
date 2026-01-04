import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkoutFormat } from './CircuitFormatSelector';

export interface CircuitParameters {
  timeCap?: number;
  rounds?: number;
  workInterval?: number;
  restInterval?: number;
}

interface CircuitParametersFormProps {
  format: WorkoutFormat;
  parameters: CircuitParameters;
  onChange: (params: CircuitParameters) => void;
}

export function CircuitParametersForm({ format, parameters, onChange }: CircuitParametersFormProps) {
  const handleChange = (key: keyof CircuitParameters, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value);
    onChange({ ...parameters, [key]: numValue });
  };

  const renderFields = () => {
    switch (format) {
      case 'amrap':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeCap">Time Cap (minuty) *</Label>
              <Input
                id="timeCap"
                type="number"
                min={1}
                max={60}
                value={parameters.timeCap ?? ''}
                onChange={(e) => handleChange('timeCap', e.target.value)}
                placeholder="15"
              />
            </div>
          </div>
        );

      case 'emom':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeCap">Počet minut *</Label>
              <Input
                id="timeCap"
                type="number"
                min={1}
                max={60}
                value={parameters.timeCap ?? ''}
                onChange={(e) => handleChange('timeCap', e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workInterval">Práce (sekundy)</Label>
              <Input
                id="workInterval"
                type="number"
                min={10}
                max={60}
                value={parameters.workInterval ?? ''}
                onChange={(e) => handleChange('workInterval', e.target.value)}
                placeholder="60"
              />
            </div>
          </div>
        );

      case 'for_time':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rounds">Počet kol *</Label>
              <Input
                id="rounds"
                type="number"
                min={1}
                max={20}
                value={parameters.rounds ?? ''}
                onChange={(e) => handleChange('rounds', e.target.value)}
                placeholder="5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeCap">Time Cap (min, volitelné)</Label>
              <Input
                id="timeCap"
                type="number"
                min={1}
                max={60}
                value={parameters.timeCap ?? ''}
                onChange={(e) => handleChange('timeCap', e.target.value)}
                placeholder="20"
              />
            </div>
          </div>
        );

      case 'tabata':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rounds">Počet kol *</Label>
              <Input
                id="rounds"
                type="number"
                min={1}
                max={20}
                value={parameters.rounds ?? 8}
                onChange={(e) => handleChange('rounds', e.target.value)}
                placeholder="8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workInterval">Práce (sekundy)</Label>
              <Input
                id="workInterval"
                type="number"
                min={5}
                max={60}
                value={parameters.workInterval ?? 20}
                onChange={(e) => handleChange('workInterval', e.target.value)}
                placeholder="20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restInterval">Odpočinek (sekundy)</Label>
              <Input
                id="restInterval"
                type="number"
                min={5}
                max={60}
                value={parameters.restInterval ?? 10}
                onChange={(e) => handleChange('restInterval', e.target.value)}
                placeholder="10"
              />
            </div>
          </div>
        );

      case 'circuit':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rounds">Počet kol *</Label>
              <Input
                id="rounds"
                type="number"
                min={1}
                max={20}
                value={parameters.rounds ?? ''}
                onChange={(e) => handleChange('rounds', e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workInterval">Práce na cvik (s)</Label>
              <Input
                id="workInterval"
                type="number"
                min={10}
                max={120}
                value={parameters.workInterval ?? ''}
                onChange={(e) => handleChange('workInterval', e.target.value)}
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restInterval">Odpočinek (s)</Label>
              <Input
                id="restInterval"
                type="number"
                min={5}
                max={120}
                value={parameters.restInterval ?? ''}
                onChange={(e) => handleChange('restInterval', e.target.value)}
                placeholder="15"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="py-4">{renderFields()}</div>;
}
