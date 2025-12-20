import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Dumbbell,
  Edit3,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedbackDetailDialog } from '@/components/feedback/FeedbackDetailDialog';
import {
  useClientHealthSnapshot,
  translatePainArea,
  TrendDirection,
  AttendanceLevel,
  CreditLevel,
} from '@/hooks/useClientHealthSnapshot';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';

interface ClientHealthSnapshotProps {
  clientId: string;
  creditBalance: number;
  trainerNote?: string;
  onSaveNote?: (note: string) => Promise<void>;
  className?: string;
}

// Trend icons and styles
const TREND_ICONS = {
  up: TrendingUp,
  stable: Minus,
  down: TrendingDown,
} as const;

const TREND_STYLES = {
  up: 'text-status-ok',
  stable: 'text-muted-foreground',
  down: 'text-status-error',
} as const;

// Attendance icons and styles
const ATTENDANCE_CONFIG = {
  regular: {
    icon: CheckCircle2,
    className: 'text-status-ok',
    label: '✔️',
  },
  fluctuating: {
    icon: AlertTriangle,
    className: 'text-status-warning',
    label: '⚠️',
  },
  dropouts: {
    icon: XCircle,
    className: 'text-status-error',
    label: '❌',
  },
} as const;

// Credit icons and styles
const CREDIT_CONFIG = {
  ok: {
    emoji: '🟢',
    className: 'text-status-ok',
  },
  low: {
    emoji: '🟠',
    className: 'text-status-warning',
  },
  exhausted: {
    emoji: '🔴',
    className: 'text-status-error',
  },
} as const;

function TrendIndicator({ 
  direction, 
  label 
}: { 
  direction: TrendDirection; 
  label: string;
}) {
  const Icon = TREND_ICONS[direction];
  const className = TREND_STYLES[direction];
  
  const arrows = {
    up: '↑',
    stable: '→',
    down: '↓',
  };
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium', className)}>
      <span className="text-base">{arrows[direction]}</span>
      {label}
    </span>
  );
}

function AttendanceIndicator({ 
  level, 
  label 
}: { 
  level: AttendanceLevel; 
  label: string;
}) {
  const config = ATTENDANCE_CONFIG[level];
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium', config.className)}>
      {config.label} {label}
    </span>
  );
}

function CreditIndicator({ 
  level, 
  label 
}: { 
  level: CreditLevel; 
  label: string;
}) {
  const config = CREDIT_CONFIG[level];
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium', config.className)}>
      {config.emoji} {label}
    </span>
  );
}

export function ClientHealthSnapshot({
  clientId,
  creditBalance,
  trainerNote = '',
  onSaveNote,
  className,
}: ClientHealthSnapshotProps) {
  const snapshot = useClientHealthSnapshot(clientId, creditBalance);
  const { data: feedbacks = [] } = useClientFeedback(clientId);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(trainerNote);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  // Get the last feedback for the dialog
  const lastFeedback = feedbacks.find(f => f.id === snapshot.lastFeedbackId) || feedbacks[0] || null;

  const handleSaveNote = async () => {
    if (!onSaveNote) return;
    setIsSavingNote(true);
    try {
      await onSaveNote(noteValue);
      setIsEditingNote(false);
    } finally {
      setIsSavingNote(false);
    }
  };

  if (snapshot.isLoading) {
    return (
      <div className={cn('glass rounded-2xl p-4 space-y-3', className)}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('glass rounded-2xl p-4', className)}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🧭</span>
          <h3 className="font-semibold text-foreground">Stav klienta</h3>
        </div>

        {/* Snapshot rows */}
        <div className="space-y-2.5">
          {/* Training Load */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Tréninková zátěž</span>
            <TrendIndicator 
              direction={snapshot.trainingLoadTrend} 
              label={snapshot.trainingLoadLabel}
            />
          </div>

          {/* Feedback Trend */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Feedback (7 dní)</span>
            <TrendIndicator 
              direction={snapshot.feedbackTrend} 
              label={snapshot.feedbackTrendLabel}
            />
          </div>

          {/* Recurring Pain */}
          {snapshot.recurringPain.length > 0 && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Bolest</span>
              <span className="text-status-warning font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {snapshot.recurringPain.map(p => translatePainArea(p.area)).join(', ')} 
                <span className="text-xs opacity-70">(opak.)</span>
              </span>
            </div>
          )}

          {/* Attendance */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Docházka</span>
            <AttendanceIndicator 
              level={snapshot.attendanceLevel} 
              label={snapshot.attendanceLabel}
            />
          </div>

          {/* Credit */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Kredit</span>
            <CreditIndicator 
              level={snapshot.creditLevel} 
              label={snapshot.creditLabel}
            />
          </div>
        </div>

        {/* Trainer note */}
        {onSaveNote && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                Poznámka trenéra
              </span>
              {!isEditingNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setIsEditingNote(true)}
                >
                  Upravit
                </Button>
              )}
            </div>
            
            {isEditingNote ? (
              <div className="flex gap-2">
                <Input
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="Krátká poznámka..."
                  className="h-8 text-sm"
                  maxLength={100}
                />
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-foreground">
                {trainerNote || <span className="text-muted-foreground italic">Žádná poznámka</span>}
              </p>
            )}
          </div>
        )}

        {/* Quick links */}
        <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
          {snapshot.lastFeedbackId && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-9 text-xs gap-1.5"
              onClick={() => setFeedbackDialogOpen(true)}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Poslední feedback
            </Button>
          )}
          {snapshot.lastTrainingId && (
            <Link 
              to={`/trainings/${snapshot.lastTrainingId}`}
              className="flex-1"
            >
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-9 text-xs gap-1.5"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                Poslední trénink
              </Button>
            </Link>
          )}
        </div>

        {/* No data state */}
        {!snapshot.hasEnoughData && (
          <div className="mt-4 p-3 bg-muted/30 rounded-xl text-center">
            <p className="text-xs text-muted-foreground">
              Nedostatek dat pro analýzu trendů.
              Potřeba min. 2 dokončené tréninky.
            </p>
          </div>
        )}
      </div>

      {/* Feedback Detail Dialog */}
      <FeedbackDetailDialog
        feedback={lastFeedback}
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
      />
    </>
  );
}
