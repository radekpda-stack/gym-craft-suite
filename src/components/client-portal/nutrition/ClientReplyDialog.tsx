/**
 * Dialog pro odpověď klienta na komentář trenéra
 */
import { useState, useEffect } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ClientReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerComment: string;
  currentReply: string | null;
  onSave: (reply: string) => Promise<void>;
  isLoading?: boolean;
}

export function ClientReplyDialog({
  open,
  onOpenChange,
  trainerComment,
  currentReply,
  onSave,
  isLoading = false,
}: ClientReplyDialogProps) {
  const [reply, setReply] = useState(currentReply || '');

  useEffect(() => {
    if (open) {
      setReply(currentReply || '');
    }
  }, [open, currentReply]);

  const handleSave = async () => {
    await onSave(reply.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Odpověď trenérovi
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Trainer's comment */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Komentář trenéra
            </Label>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">{trainerComment}</p>
            </div>
          </div>

          {/* Reply */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Vaše odpověď
            </Label>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Napište odpověď..."
              className="min-h-[100px]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !reply.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Odeslat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
