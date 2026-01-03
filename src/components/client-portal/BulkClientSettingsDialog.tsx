import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkUpdateClientSettings } from '@/hooks/useBulkUpdateClientSettings';
import { Loader2, Users } from 'lucide-react';

interface BulkClientSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClientIds: string[];
  onComplete: () => void;
}

type SettingValue = 'enable' | 'disable' | 'no_change';

interface SettingState {
  enabled: boolean;
  value: SettingValue;
}

const GRAPH_VISIBILITY_OPTIONS = [
  { key: 'weight', label: 'Váha' },
  { key: 'bodyFat', label: 'Tělesný tuk' },
  { key: 'trackedExercises', label: 'Sledované cviky' },
  { key: 'rowing500m', label: 'Veslo 500m' },
  { key: 'rowing1000m', label: 'Veslo 1000m' },
  { key: 'running500m', label: 'Běh 500m' },
  { key: 'running1000m', label: 'Běh 1000m' },
];

export function BulkClientSettingsDialog({
  open,
  onOpenChange,
  selectedClientIds,
  onComplete,
}: BulkClientSettingsDialogProps) {
  const bulkUpdate = useBulkUpdateClientSettings();

  // Portal settings
  const [anonymity, setAnonymity] = useState<SettingState>({ enabled: false, value: 'no_change' });
  const [challenges, setChallenges] = useState<SettingState>({ enabled: false, value: 'no_change' });
  const [accessStatus, setAccessStatus] = useState<SettingState>({ enabled: false, value: 'no_change' });

  // Graph visibility
  const [graphSettings, setGraphSettings] = useState<Record<string, SettingState>>(
    Object.fromEntries(
      GRAPH_VISIBILITY_OPTIONS.map(opt => [opt.key, { enabled: false, value: 'no_change' as SettingValue }])
    )
  );

  const handleApply = async () => {
    const settings: Parameters<typeof bulkUpdate.mutateAsync>[0]['settings'] = {};

    // Portal settings
    if (anonymity.enabled && anonymity.value !== 'no_change') {
      settings.allow_anonymous_benchmarks = anonymity.value === 'enable';
    }
    if (challenges.enabled && challenges.value !== 'no_change') {
      settings.allow_challenges_participation = challenges.value === 'enable';
    }
    if (accessStatus.enabled && accessStatus.value !== 'no_change') {
      settings.is_active = accessStatus.value === 'enable';
    }

    // Graph visibility
    const graphVisibility: Record<string, boolean> = {};
    let hasGraphChanges = false;
    for (const [key, state] of Object.entries(graphSettings)) {
      if (state.enabled && state.value !== 'no_change') {
        graphVisibility[key] = state.value === 'enable';
        hasGraphChanges = true;
      }
    }
    if (hasGraphChanges) {
      settings.graphVisibility = graphVisibility;
    }

    // Check if any changes
    if (Object.keys(settings).length === 0) {
      onOpenChange(false);
      return;
    }

    await bulkUpdate.mutateAsync({
      clientIds: selectedClientIds,
      settings,
    });

    onComplete();
    onOpenChange(false);
  };

  const SettingRow = ({
    label,
    state,
    onChange,
  }: {
    label: string;
    state: SettingState;
    onChange: (state: SettingState) => void;
  }) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={state.enabled}
          onCheckedChange={(checked) => onChange({ ...state, enabled: !!checked })}
        />
        <Label className="text-sm cursor-pointer">{label}</Label>
      </div>
      <Select
        value={state.value}
        onValueChange={(value: SettingValue) => onChange({ ...state, value })}
        disabled={!state.enabled}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no_change">Beze změny</SelectItem>
          <SelectItem value="enable">Zapnout</SelectItem>
          <SelectItem value="disable">Vypnout</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Hromadné nastavení
          </DialogTitle>
          <DialogDescription>
            Změny se aplikují na {selectedClientIds.length} vybraných klientů.
            Zaškrtněte nastavení, která chcete změnit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Portal Settings */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Nastavení portálu</h4>
            <div className="border rounded-lg p-3 space-y-1">
              <SettingRow
                label="Anonymita v žebříčcích"
                state={anonymity}
                onChange={setAnonymity}
              />
              <SettingRow
                label="Účast v challenges"
                state={challenges}
                onChange={setChallenges}
              />
            </div>
          </div>

          {/* Graph Visibility */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Viditelnost grafů</h4>
            <div className="border rounded-lg p-3 space-y-1">
              {GRAPH_VISIBILITY_OPTIONS.map((opt) => (
                <SettingRow
                  key={opt.key}
                  label={opt.label}
                  state={graphSettings[opt.key]}
                  onChange={(state) =>
                    setGraphSettings((prev) => ({ ...prev, [opt.key]: state }))
                  }
                />
              ))}
            </div>
          </div>

          {/* Access Status */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Stav účtu</h4>
            <div className="border rounded-lg p-3">
              <SettingRow
                label="Stav přístupu"
                state={accessStatus}
                onChange={setAccessStatus}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleApply} disabled={bulkUpdate.isPending}>
            {bulkUpdate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Aplikovat změny
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
