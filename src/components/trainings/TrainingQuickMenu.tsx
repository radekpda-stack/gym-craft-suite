import { useNavigate } from 'react-router-dom';
import { Check, X, Pencil, Eye } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TrainingSession } from '@/hooks/useTrainingSessions';

interface TrainingQuickMenuProps {
  session: TrainingSession;
  children: React.ReactNode;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TrainingQuickMenu({
  session,
  children,
  onComplete,
  onCancel,
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
          onClick={() => navigate(`/trainings/${session.id}`)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          Zobrazit detail
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => navigate(`/trainings/${session.id}?edit=true`)}
          className="gap-2"
        >
          <Pencil className="w-4 h-4" />
          Upravit
        </ContextMenuItem>
        {isScheduled && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onComplete} className="gap-2 text-green-500">
              <Check className="w-4 h-4" />
              Dokončit
            </ContextMenuItem>
            <ContextMenuItem onClick={onCancel} className="gap-2 text-destructive">
              <X className="w-4 h-4" />
              Zrušit
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
