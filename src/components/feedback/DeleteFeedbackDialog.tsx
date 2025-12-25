import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface DeleteFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  feedbackInfo?: {
    clientName: string;
    isCompleted: boolean;
  };
  bulkCount?: number;
}

export function DeleteFeedbackDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  feedbackInfo,
  bulkCount,
}: DeleteFeedbackDialogProps) {
  const isBulk = bulkCount !== undefined && bulkCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {isBulk ? 'Smazat vybrané feedbacky?' : 'Smazat feedback?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {isBulk ? (
              <>
                <p>
                  Chystáte se smazat <strong>{bulkCount} feedback{bulkCount === 1 ? '' : bulkCount <= 4 ? 'y' : 'ů'}</strong> včetně všech odpovědí.
                </p>
                <p className="text-destructive font-medium">
                  Tato akce je nevratná a odstraní data ze statistik!
                </p>
              </>
            ) : feedbackInfo ? (
              <>
                <p>
                  Chystáte se smazat feedback od klienta <strong>{feedbackInfo.clientName}</strong>.
                </p>
                {feedbackInfo.isCompleted && (
                  <p>
                    Včetně vyplněných odpovědí bude odstraněn ze statistik.
                  </p>
                )}
                <p className="text-destructive font-medium">
                  Tato akce je nevratná!
                </p>
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Mazání...' : isBulk ? `Smazat ${bulkCount} feedback${bulkCount === 1 ? '' : bulkCount <= 4 ? 'y' : 'ů'}` : 'Smazat feedback'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
