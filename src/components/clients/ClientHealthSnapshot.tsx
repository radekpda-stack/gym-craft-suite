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

// Simplified trend display - just icon and status (Master Prompt: no numbers, no reasons)
const TREND_DISPLAY = {
  up: { arrow: '↑', label: 'stabilní', className: 'text-status-ok' },
  stable: { arrow: '→', label: 'stabilní', className: 'text-muted-foreground' },
  down: { arrow: '↓', label: 'pozor', className: 'text-status-error' },
} as const;

// Attendance display
const ATTENDANCE_DISPLAY = {
  regular: { emoji: '✔️', label: 'pravidelná', className: 'text-status-ok' },
  fluctuating: { emoji: '⚠️', label: 'kolísavá', className: 'text-status-warning' },
  dropouts: { emoji: '❌', label: 'výpadky', className: 'text-status-error' },
} as const;

// Credit display
const CREDIT_DISPLAY = {
  ok: { emoji: '🟢', label: 'ok', className: 'text-status-ok' },
  low: { emoji: '🟠', label: 'nízký', className: 'text-status-warning' },
  exhausted: { emoji: '🔴', label: 'vyčerpaný', className: 'text-status-error' },
} as const;

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

  const trendDisplay = TREND_DISPLAY[snapshot.trainingLoadTrend];
  const feedbackDisplay = TREND_DISPLAY[snapshot.feedbackTrend];
  const attendanceDisplay = ATTENDANCE_DISPLAY[snapshot.attendanceLevel];
  const creditDisplay = CREDIT_DISPLAY[snapshot.creditLevel];

  return (
    <>
      <div className={cn('glass rounded-2xl p-4', className)}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🧭</span>
          <h3 className="font-semibold text-foreground">Stav klienta</h3>
        </div>

        {/* Simplified snapshot rows - no numbers, no detailed reasons */}
        <div className="space-y-2.5">
          {/* Training Load */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Zátěž</span>
            <span className={cn('font-medium flex items-center gap-1.5', trendDisplay.className)}>
              <span className="text-base">{trendDisplay.arrow}</span>
              {trendDisplay.label}
            </span>
          </div>

          {/* Feedback Trend - simplified */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Feedback</span>
            <span className={cn('font-medium flex items-center gap-1.5', feedbackDisplay.className)}>
              <span className="text-base">{feedbackDisplay.arrow}</span>
              {feedbackDisplay.label}
            </span>
          </div>

          {/* Recurring Pain - simplified, just show "opakovaná" if exists */}
          {snapshot.recurringPain.length > 0 && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Bolest</span>
              <span className="text-status-warning font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                opakovaná
              </span>
            </div>
          )}

          {/* Attendance - simplified */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Docházka</span>
            <span className={cn('font-medium flex items-center gap-1.5', attendanceDisplay.className)}>
              {attendanceDisplay.emoji} {attendanceDisplay.label}
            </span>
          </div>

          {/* Credit - simplified */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Kredit</span>
            <span className={cn('font-medium flex items-center gap-1.5', creditDisplay.className)}>
              {creditDisplay.emoji} {creditDisplay.label}
            </span>
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
