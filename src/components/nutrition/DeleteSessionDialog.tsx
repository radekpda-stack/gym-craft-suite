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

interface DeleteSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  sessionInfo?: {
    clientName: string;
    entriesCount: number;
  };
  bulkCount?: number;
}

export function DeleteSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  sessionInfo,
  bulkCount,
}: DeleteSessionDialogProps) {
  const isBulk = bulkCount !== undefined && bulkCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {isBulk ? 'Smazat vybrané dotazníky?' : 'Smazat dotazník?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {isBulk ? (
              <>
                <p>
                  Chystáte se smazat <strong>{bulkCount} dotazník{bulkCount === 1 ? '' : bulkCount <= 4 ? 'y' : 'ů'}</strong> včetně všech jejich záznamů.
                </p>
                <p className="text-destructive font-medium">
                  Tato akce je nevratná!
                </p>
              </>
            ) : sessionInfo ? (
              <>
                <p>
                  Chystáte se smazat dotazník klienta <strong>{sessionInfo.clientName}</strong>.
                </p>
                {sessionInfo.entriesCount > 0 && (
                  <p>
                    Bude smazáno <strong>{sessionInfo.entriesCount} záznam{sessionInfo.entriesCount === 1 ? '' : sessionInfo.entriesCount <= 4 ? 'y' : 'ů'}</strong> (jídla, nápoje, káva).
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
            {isDeleting ? 'Mazání...' : isBulk ? `Smazat ${bulkCount} dotazník${bulkCount === 1 ? '' : bulkCount <= 4 ? 'y' : 'ů'}` : 'Smazat dotazník'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
