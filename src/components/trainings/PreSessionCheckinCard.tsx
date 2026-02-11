/**
 * PreSessionCheckinCard - Quick check-in before training
 * Records energy level, sleep quality, and optional pain area.
 */
import { useState, useEffect } from 'react';
import { Activity, Moon, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EnergyRating } from '@/components/client-portal/workout-diary/EnergyRating';
import { cn } from '@/lib/utils';
import { usePreSessionCheckin, useSavePreSessionCheckin } from '@/hooks/usePreSessionCheckin';
import { toast } from '@/hooks/use-toast';

const PAIN_AREAS = [
  'Záda', 'Rameno', 'Koleno', 'Kyčel', 'Krk', 
  'Loket', 'Zápěstí', 'Kotník', 'Jiné',
] as const;

interface PreSessionCheckinCardProps {
  sessionId: string;
  clientId: string;
  clientName: string;
  className?: string;
}

export function PreSessionCheckinCard({ sessionId, clientId, clientName, className }: PreSessionCheckinCardProps) {
  const { data: existingCheckin, isLoading } = usePreSessionCheckin(sessionId);
  const saveCheckin = useSavePreSessionCheckin();

  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [painArea, setPainArea] = useState<string | null>(null);
  const [painNotes, setPainNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // Load existing data
  useEffect(() => {
    if (existingCheckin) {
      setEnergy(existingCheckin.energy_level);
      setSleep(existingCheckin.sleep_quality);
      setPainArea(existingCheckin.pain_area);
      setPainNotes(existingCheckin.pain_notes || '');
      setSaved(true);
    }
  }, [existingCheckin]);

  const handleSave = async () => {
    await saveCheckin.mutateAsync({
      training_session_id: sessionId,
      client_id: clientId,
      energy_level: energy,
      sleep_quality: sleep,
      pain_area: painArea,
      pain_notes: painNotes || null,
    });
    setSaved(true);
    toast({ title: 'Check-in uložen' });
  };

  if (isLoading) return null;

  // Compact saved state
  if (saved && !saveCheckin.isPending) {
    return (
      <div className={cn(
        "rounded-2xl p-4 bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-success/10 shadow-sm">
              <Check className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Check-in hotov</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {energy && <span>⚡ {energy}/5</span>}
                {sleep && <span>😴 {sleep}/5</span>}
                {painArea && <span className="text-warning">⚠ {painArea}</span>}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setSaved(false)}
          >
            Upravit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl p-4 bg-card/80 backdrop-blur-sm border border-primary/20 shadow-sm space-y-4",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 shadow-sm shadow-primary/10">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">Jak se dnes cítí {clientName.split(' ')[0]}?</p>
          <p className="text-xs text-muted-foreground">Rychlý check-in před tréninkem</p>
        </div>
      </div>

      {/* Energy level */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Activity className="w-3.5 h-3.5" />
          Energie
        </div>
        <EnergyRating value={energy} onChange={setEnergy} />
      </div>

      {/* Sleep quality */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Moon className="w-3.5 h-3.5" />
          Kvalita spánku
        </div>
        <EnergyRating value={sleep} onChange={setSleep} />
      </div>

      {/* Pain area - optional */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <AlertTriangle className="w-3.5 h-3.5" />
          Bolest/omezení (volitelné)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PAIN_AREAS.map(area => (
            <button
              key={area}
              type="button"
              onClick={() => setPainArea(painArea === area ? null : area)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs transition-all",
                painArea === area
                  ? "bg-warning/20 text-warning ring-1 ring-warning/50 font-medium"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {area}
            </button>
          ))}
        </div>
        {painArea && (
          <Textarea
            value={painNotes}
            onChange={e => setPainNotes(e.target.value)}
            placeholder="Podrobnosti k bolesti..."
            rows={2}
            className="text-sm resize-none mt-1"
          />
        )}
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={(!energy && !sleep) || saveCheckin.isPending}
        className="w-full"
        size="sm"
      >
        {saveCheckin.isPending ? (
          <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Ukládám...</>
        ) : (
          <><Check className="w-4 h-4 mr-1.5" /> Uložit check-in</>
        )}
      </Button>
    </div>
  );
}
