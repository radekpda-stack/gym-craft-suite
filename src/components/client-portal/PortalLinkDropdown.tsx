import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, Check, ChevronDown, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeDisplay } from './QRCodeDisplay';

export function PortalLinkDropdown() {
  const [copied, setCopied] = useState(false);
  const loginUrl = `${window.location.origin}/login?mode=client`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    toast.success('Odkaz zkopírován');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Odkaz pro klienty</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-3 bg-popover">
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Přihlašovací odkaz
          </div>
          <code className="block text-xs bg-muted p-2 rounded break-all">
            {loginUrl}
          </code>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-success" />
                  Zkopírováno
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Kopírovat
                </>
              )}
            </Button>
            <QRCodeDisplay url={loginUrl} />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
