import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ExternalLink, Eye, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortalPreviewButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PortalPreviewButton({ variant = 'outline', size = 'default' }: PortalPreviewButtonProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  const portalUrl = `${window.location.origin}/client?demo=true`;

  const handleOpenInNewTab = () => {
    window.open(portalUrl, '_blank');
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setPreviewOpen(true)}>
        <Eye className="w-4 h-4 mr-2" />
        Náhled portálu
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Náhled klientského portálu</DialogTitle>
                <DialogDescription>
                  Toto je pohled, který vidí vaši klienti po přihlášení.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('mobile')}
                    className="px-3"
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('desktop')}
                    className="px-3"
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Otevřít
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg p-4 overflow-hidden">
            <div
              className={cn(
                'bg-background rounded-lg shadow-xl border overflow-hidden transition-all duration-300',
                viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'
              )}
            >
              <iframe
                src={portalUrl}
                className="w-full h-full border-0"
                title="Portal Preview"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
