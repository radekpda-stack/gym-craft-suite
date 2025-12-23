import { useState, useEffect } from 'react';
import { Copy, Check, ClipboardList, Loader2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreatePreDiagnosticInvite } from '@/hooks/usePreDiagnosticForms';
import { toast } from 'sonner';

interface PreDiagnosticInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreDiagnosticInviteDialog({ open, onOpenChange }: PreDiagnosticInviteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
  const createInvite = useCreatePreDiagnosticInvite();

  // Generate link when dialog opens
  useEffect(() => {
    if (open && !generatedLink && !createInvite.isPending) {
      createInvite.mutate(undefined, {
        onSuccess: (data) => {
          const baseUrl = window.location.origin;
          setGeneratedLink(`${baseUrl}/pre-diagnostic/${data.token}`);
        },
      });
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setGeneratedLink(null);
    }
  }, [open]);

  const handleCopy = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Odkaz zkopírován do schránky');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Nepodařilo se zkopírovat odkaz');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Pozvat nového klienta
          </DialogTitle>
          <DialogDescription>
            Vygenerujte odkaz na pre-diagnostický formulář pro nového klienta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {createInvite.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Generuji odkaz...</span>
            </div>
          ) : generatedLink ? (
            <>
              {/* Generated Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Odkaz pro klienta
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-secondary/50 rounded-lg border text-sm break-all">
                    {generatedLink}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <p className="text-foreground">
                  <strong>Platnost odkazu:</strong> 7 dní
                </p>
                <p className="text-muted-foreground mt-1">
                  Po vyplnění formuláře klientem se údaje zobrazí v sekci 
                  "Nepřiřazené pre-diagnostiky" na této stránce.
                </p>
              </div>

              {/* Copy Button */}
              <Button onClick={handleCopy} className="w-full gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Zkopírováno
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopírovat odkaz
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nepodařilo se vygenerovat odkaz
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
