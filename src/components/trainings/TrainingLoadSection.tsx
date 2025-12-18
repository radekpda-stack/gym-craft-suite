import { Gauge, Activity, Target, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingLoadSectionProps {
  rpe?: number | null;
  rir?: number | null;
  totalVolume?: number | null;
  intensityNotes?: string | null;
  subjectiveDifficulty?: number | null;
  isEditMode?: boolean;
  onUpdate?: (field: string, value: any) => void;
}

export function TrainingLoadSection({
  rpe,
  rir,
  totalVolume,
  intensityNotes,
  subjectiveDifficulty,
  isEditMode,
  onUpdate,
}: TrainingLoadSectionProps) {
  const hasData = rpe || rir || totalVolume || intensityNotes || subjectiveDifficulty;

  if (!hasData && !isEditMode) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        Zátěž
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* RPE */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Gauge className="w-3.5 h-3.5" />
            <span className="text-xs">RPE</span>
          </div>
          {isEditMode ? (
            <input
              type="number"
              min={1}
              max={10}
              value={rpe || ''}
              onChange={(e) => onUpdate?.('rpe', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="1-10"
            />
          ) : (
            <div className={cn(
              "text-lg font-bold",
              rpe && rpe >= 8 ? "text-warning" : "text-foreground"
            )}>
              {rpe || '—'}
            </div>
          )}
        </div>

        {/* RIR */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs">RIR</span>
          </div>
          {isEditMode ? (
            <input
              type="number"
              min={0}
              max={10}
              value={rir ?? ''}
              onChange={(e) => onUpdate?.('rir', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="0-10"
            />
          ) : (
            <div className="text-lg font-bold text-foreground">
              {rir ?? '—'}
            </div>
          )}
        </div>

        {/* Volume */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs">Objem</span>
          </div>
          {isEditMode ? (
            <input
              type="number"
              min={0}
              value={totalVolume || ''}
              onChange={(e) => onUpdate?.('total_volume', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="série × opa"
            />
          ) : (
            <div className="text-lg font-bold text-foreground">
              {totalVolume || '—'}
            </div>
          )}
        </div>

        {/* Subjective Difficulty */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Brain className="w-3.5 h-3.5" />
            <span className="text-xs">Náročnost</span>
          </div>
          {isEditMode ? (
            <input
              type="number"
              min={1}
              max={10}
              value={subjectiveDifficulty || ''}
              onChange={(e) => onUpdate?.('subjective_difficulty', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="1-10"
            />
          ) : (
            <div className={cn(
              "text-lg font-bold",
              subjectiveDifficulty && subjectiveDifficulty >= 8 ? "text-warning" : "text-foreground"
            )}>
              {subjectiveDifficulty || '—'}
            </div>
          )}
        </div>
      </div>

      {/* Intensity Notes */}
      {(intensityNotes || isEditMode) && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Poznámka k intenzitě</span>
          {isEditMode ? (
            <textarea
              value={intensityNotes || ''}
              onChange={(e) => onUpdate?.('intensity_notes', e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm min-h-[60px]"
              placeholder="Váhy, tempo, zóny..."
            />
          ) : (
            <p className="text-sm text-foreground">{intensityNotes}</p>
          )}
        </div>
      )}
    </div>
  );
}
