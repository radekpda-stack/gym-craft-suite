import { useState, useMemo } from 'react';
import { 
  Check, 
  X, 
  CalendarDays, 
  ChevronDown, 
  ChevronUp,
  Users,
  Clock,
  GripVertical,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ClientPRsQuickView } from './ClientPRsQuickView';
import { QuickExerciseAdd } from './QuickExerciseAdd';
import { RescheduleDialog } from './RescheduleDialog';
import { SwipeableCard } from './SwipeableCard';
import { TrainingTagStepper } from '@/components/trainings/TrainingTagStepper';
import { CompleteTrainingDialog } from '@/components/trainings/CompleteTrainingDialog';
import { CancelTrainingDialog } from '@/components/trainings/CancelTrainingDialog';
import { useTrainingParticipants } from '@/hooks/useTrainingParticipants';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessionTags, useUpdateTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useUpdateTrainingSession } from '@/hooks/useTrainingSessions';
import { useTrainingPrices, getTrainingPrice } from '@/hooks/useAppSettings';
import { useTags } from '@/hooks/useTags';
import { toast } from 'sonner';

interface TrainingModeCardSession {
  id: string;
  date: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'canceled';
  client_id: string;
  participant_count?: number;
  notes?: string | null;
  final_price?: number | null;
  rpe?: number | null;
  training_type?: string | null;
}

interface TrainingModeCardProps {
  session: TrainingModeCardSession;
  isActive: boolean;
  onToggleActive: (id: string) => void;
  onComplete?: () => void;
}

export function TrainingModeCard({
  session,
  isActive,
  onToggleActive,
  onComplete,
}: TrainingModeCardProps) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showExerciseAdd, setShowExerciseAdd] = useState(false);
  const [selectedClientForExercise, setSelectedClientForExercise] = useState<string | null>(null);
  
  const { data: participants = [] } = useTrainingParticipants(session.id);
  const { data: clients = [] } = useClients();
  const { data: allTags = [] } = useTags();
  const trainingPrices = useTrainingPrices();
  
  // Get session tags from the linking table
  const { data: sessionTagLinks = [] } = useTrainingSessionTags(session.id);
  const updateSessionTags = useUpdateTrainingSessionTags();
  const updateTrainingSession = useUpdateTrainingSession();

  // Extract tag IDs from the session tag links
  const sessionTags = useMemo(() => {
    const tagIds = sessionTagLinks.map(link => link.tag_id);
    
    // Separate tags by type
    const focusTagIds = tagIds.filter(id => {
      const tag = allTags.find(t => t.id === id);
      return tag?.tag_type === 'focus';
    });
    
    const intensityTag = tagIds.find(id => {
      const tag = allTags.find(t => t.id === id);
      return tag?.tag_type === 'intensity';
    });
    
    const bodyPartTagIds = tagIds.filter(id => {
      const tag = allTags.find(t => t.id === id);
      return tag?.tag_type === 'body_part';
    });
    
    return {
      trainingType: session.training_type || null,
      coachRPE: session.rpe ?? null,
      focusTagIds,
      intensityTagId: intensityTag || null,
      bodyPartTagIds,
    };
  }, [sessionTagLinks, allTags, session.training_type, session.rpe]);

  // Get all participant IDs
  const participantIds = participants.length > 0
    ? participants.map(p => p.client_id)
    : [session.client_id];

  // Get client names
  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Klient';
  
  const participantNames = participantIds.map(getClientName);
  const participantCount = participantIds.length;
  
  // Format time
  const sessionDate = new Date(session.date);
  const timeStr = format(sessionDate, 'HH:mm');
  
  // Get status display
  const getStatusBadge = () => {
    switch (session.status) {
      case 'completed':
        return <Badge className="bg-success/20 text-success border-0 text-[10px]">Dokončeno</Badge>;
      case 'cancelled':
      case 'canceled':
        return <Badge variant="destructive" className="text-[10px]">Zrušeno</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Naplánováno</Badge>;
    }
  };

  // Calculate price
  const estimatedPrice = session.final_price || getTrainingPrice(participantCount, trainingPrices);

  // Handle training type and RPE changes (stored directly on training_sessions)
  const handleTrainingTypeChange = async (type: string) => {
    await updateTrainingSession.mutateAsync({
      id: session.id,
      input: { training_type: type },
    });
  };

  const handleCoachRPEChange = async (rpe: number) => {
    await updateTrainingSession.mutateAsync({
      id: session.id,
      input: { rpe },
    });
  };

  // Handle tag changes (stored in training_session_tags)
  const handleTagsChange = async (updates: {
    focusTagIds?: string[];
    intensityTagId?: string | null;
    bodyPartTagIds?: string[];
  }) => {
    const focusIds = updates.focusTagIds ?? sessionTags.focusTagIds;
    const intensityId = updates.intensityTagId !== undefined ? updates.intensityTagId : sessionTags.intensityTagId;
    const bodyPartIds = updates.bodyPartTagIds ?? sessionTags.bodyPartTagIds;
    
    // Combine all tag IDs
    const allTagIds = [
      ...focusIds,
      ...(intensityId ? [intensityId] : []),
      ...bodyPartIds,
    ];
    
    await updateSessionTags.mutateAsync({
      trainingSessionId: session.id,
      tagIds: allTagIds,
    });
  };

  const isCompleted = session.status === 'completed';
  const isCancelled = session.status === 'cancelled' || session.status === 'canceled';
  const canTakeAction = !isCompleted && !isCancelled;

  // Quick swipe actions
  const handleSwipeComplete = () => {
    if (canTakeAction) {
      setShowCompleteDialog(true);
    }
  };

  const handleSwipeCancel = () => {
    if (canTakeAction) {
      setShowCancelDialog(true);
    }
  };

  const cardContent = (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 bg-card",
        isActive 
          ? "border-primary bg-primary/5 shadow-lg" 
          : "border-border/50 hover:border-border",
        (isCompleted || isCancelled) && "opacity-60"
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => onToggleActive(session.id)}
        className="w-full p-4 text-left min-h-[76px]"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Swipe hint indicator */}
          {canTakeAction && !isActive && (
            <div className="flex items-center self-center mr-1">
              <GripVertical className="w-4 h-4 text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-base">{timeStr}</span>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-foreground truncate font-medium">
              {participantNames.join(', ')}
            </p>
            {participantCount > 1 && (
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{participantCount} účastníků</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-primary">{estimatedPrice} Kč</span>
            {isActive ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

        {/* Expanded content */}
        {isActive && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
            {/* Tags Section */}
            <TrainingTagStepper
              trainingType={sessionTags.trainingType}
              onTrainingTypeChange={handleTrainingTypeChange}
              focusTagIds={sessionTags.focusTagIds}
              onFocusTagsChange={(ids) => handleTagsChange({ focusTagIds: ids })}
              intensityTagId={sessionTags.intensityTagId}
              onIntensityTagChange={(id) => handleTagsChange({ intensityTagId: id })}
              bodyPartTagIds={sessionTags.bodyPartTagIds}
              onBodyPartTagsChange={(ids) => handleTagsChange({ bodyPartTagIds: ids })}
              coachRPE={sessionTags.coachRPE}
              onCoachRPEChange={handleCoachRPEChange}
              trainingStatus={session.status === 'completed' ? 'completed' : 'scheduled'}
              compact
              className="pb-4 border-b border-border/50"
            />

            {/* PRs Section */}
            <ClientPRsQuickView 
              participantIds={participantIds} 
              maxItems={6}
              className="pb-4 border-b border-border/50"
            />

            {/* Quick Actions */}
            {canTakeAction && (
              <div className="space-y-3">
                {/* Add Exercise button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedClientForExercise(participantIds[0]);
                    setShowExerciseAdd(true);
                  }}
                  className="w-full h-12 gap-2 text-base"
                >
                  <Plus className="w-5 h-5" />
                  Přidat cvik
                </Button>

                {/* Main action buttons - stack on very small screens */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setShowCompleteDialog(true)}
                    className="h-12 bg-success hover:bg-success/90 text-white gap-2"
                  >
                    <Check className="w-5 h-5" />
                    <span className="truncate">Dokončit</span>
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    className="h-12 gap-2"
                  >
                    <X className="w-5 h-5" />
                    <span className="truncate">Zrušit</span>
                  </Button>
                </div>

                {/* Reschedule button - full width */}
                <Button
                  variant="outline"
                  onClick={() => setShowRescheduleDialog(true)}
                  className="w-full h-11 gap-2"
                >
                  <CalendarDays className="w-5 h-5" />
                  Přesunout termín
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
  );

  return (
    <>
      {canTakeAction && !isActive ? (
        <SwipeableCard
          onSwipeLeft={handleSwipeCancel}
          onSwipeRight={handleSwipeComplete}
          leftLabel="Zrušit"
          rightLabel="Dokončit"
        >
          {cardContent}
        </SwipeableCard>
      ) : (
        cardContent
      )}

      {/* Dialogs */}
      <CompleteTrainingDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        session={session}
        onSuccess={() => {
          onComplete?.();
          onToggleActive(session.id);
        }}
      />

      <CancelTrainingDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        session={{
          id: session.id,
          date: session.date,
          duration: session.duration,
          participant_count: session.participant_count,
          client_id: session.client_id,
        }}
        clientName={participantNames[0]}
        trainingPrice={estimatedPrice}
        onConfirm={async (deductCredit) => {
          // Cancel logic is handled by the dialog
          setShowCancelDialog(false);
        }}
        isLoading={false}
      />

      <RescheduleDialog
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        sessionId={session.id}
        currentDate={session.date}
        clientName={participantNames.join(', ')}
        onSuccess={onComplete}
      />

      {selectedClientForExercise && (
        <QuickExerciseAdd
          open={showExerciseAdd}
          onOpenChange={setShowExerciseAdd}
          clientId={selectedClientForExercise}
          trainingSessionId={session.id}
        />
      )}
    </>
  );
}
