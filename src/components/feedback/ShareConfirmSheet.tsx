import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Copy, 
  Check, 
  Send, 
  User, 
  Calendar, 
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  trainingDate: string;
  linkUrl: string;
  linkToken: string;
  onLinkCopied?: () => void;
  onLinkSent?: () => void;
  onOpenClientCard?: () => void;
}

export function ShareConfirmSheet({
  open,
  onOpenChange,
  clientName,
  trainingDate,
  linkUrl,
  linkToken,
  onLinkCopied,
  onLinkSent,
  onOpenClientCard,
}: ShareConfirmSheetProps) {
  const [copied, setCopied] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);

  // Copy link to clipboard only (without marking as sent)
  const handleCopyOnly = async () => {
    const success = await copyToClipboard(linkUrl);
    if (success) {
      setCopied(true);
      toast.success('Odkaz zkopírován (pouze zkopírováno, neoznačeno jako odeslané)');
      onLinkCopied?.();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Copy link and mark as sent
  const handleShareAndMarkSent = async () => {
    // First copy to clipboard
    const copySuccess = await copyToClipboard(linkUrl);
    if (!copySuccess) {
      toast.error('Nepodařilo se zkopírovat odkaz');
      return;
    }

    setCopied(true);
    setIsMarkingSent(true);

    try {
      // Mark as sent in database
      const { error } = await supabase.functions.invoke('mark-feedback-sent', {
        body: { 
          token: linkToken,
          send_channel: 'manual',
        },
      });

      if (error) throw error;

      toast.success('Odkaz zkopírován a označen jako odeslaný');
      onLinkSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error marking as sent:', error);
      toast.error('Odkaz zkopírován, ale nepodařilo se označit jako odeslaný');
    } finally {
      setIsMarkingSent(false);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper function to copy to clipboard with fallback
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        console.warn('Clipboard API failed');
      }
    }

    // Fallback: create temporary input
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Sdílet odkaz pro zpětnou vazbu</SheetTitle>
          <SheetDescription>
            Zkontrolujte údaje před sdílením
          </SheetDescription>
        </SheetHeader>

        {/* Client and Training Info - Double-check display */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Odesíláte feedback pro:</p>
              <p className="font-semibold text-lg">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Trénink: {format(new Date(trainingDate), "EEEE d. MMMM yyyy 'v' HH:mm", { locale: cs })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleShareAndMarkSent}
            disabled={isMarkingSent}
            className="w-full h-12"
          >
            {isMarkingSent ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Sdílet a označit jako odesláno
          </Button>

          <Button
            variant="outline"
            onClick={handleCopyOnly}
            disabled={isMarkingSent}
            className={cn('w-full h-12', copied && 'border-green-500 text-green-600')}
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Jen zkopírovat (bez označení)
          </Button>

          {onOpenClientCard && (
            <Button
              variant="ghost"
              onClick={() => {
                onOpenClientCard();
                onOpenChange(false);
              }}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Otevřít kartu klienta
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Zrušit
          </Button>
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          "Jen zkopírovat" pouze uloží, že byl odkaz zkopírován. 
          "Sdílet a označit" označí odkaz jako odeslaný klientovi.
        </p>
      </SheetContent>
    </Sheet>
  );
}
