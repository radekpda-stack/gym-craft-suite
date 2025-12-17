import { useNavigate } from 'react-router-dom';
import { Check, X, Pencil, Eye, Copy } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { featureTracker } from '@/hooks/useFeatureTracking';

interface TrainingQuickMenuProps {
  session: TrainingSession;
  children: React.ReactNode;
  onComplete?: () => void;
  onCancel?: () => void;
  onDuplicate?: () => void;
}

export function TrainingQuickMenu({
  session,
  children,
  onComplete,
  onCancel,
  onDuplicate,
}: TrainingQuickMenuProps) {
  const navigate = useNavigate();
  const isScheduled = session.status === 'scheduled';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => {
            featureTracker.track('context_menu_view_training', 'trainings');
            navigate(`/trainings/${session.id}`);
          }}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          Zobrazit detail
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            featureTracker.track('context_menu_edit_training', 'trainings');
            navigate(`/trainings/${session.id}?edit=true`);
          }}
          className="gap-2"
        >
          <Pencil className="w-4 h-4" />
          Upravit
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => {
            featureTracker.track('training_duplicate', 'trainings');
            onDuplicate?.();
          }} 
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          Duplikovat
        </ContextMenuItem>
        {isScheduled && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => {
                featureTracker.track('context_menu_complete_training', 'trainings');
                onComplete?.();
              }} 
              className="gap-2 text-green-500"
            >
              <Check className="w-4 h-4" />
              Dokončit
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => {
                featureTracker.track('context_menu_cancel_training', 'trainings');
                onCancel?.();
              }} 
              className="gap-2 text-destructive"
            >
              <X className="w-4 h-4" />
              Zrušit
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
