import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Link2 } from 'lucide-react';
import { useJoinPeerChallenge } from '@/hooks/usePeerChallenges';

interface JoinByCodeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function JoinByCodeDialog({ open, onClose }: JoinByCodeDialogProps) {
  const [code, setCode] = useState('');
  const joinByCode = useJoinPeerChallenge();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    await joinByCode.mutateAsync(code.trim().toUpperCase());
    setCode('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Připojit se kódem
          </DialogTitle>
          <DialogDescription>
            Zadej kód výzvy, který jsi dostal od jiného klienta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Kód výzvy</Label>
            <Input
              id="invite-code"
              placeholder="např. ABC12345"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center text-lg font-mono tracking-widest"
              maxLength={8}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!code.trim() || joinByCode.isPending}
            >
              {joinByCode.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Připojit se
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
