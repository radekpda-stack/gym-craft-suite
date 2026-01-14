import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, Camera, Link2, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Challenge, useUpdateChallenge } from '@/hooks/useChallenges';

interface QuickPublicSettingsDialogProps {
  challenge: Challenge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickPublicSettingsDialog({ 
  challenge, 
  open, 
  onOpenChange 
}: QuickPublicSettingsDialogProps) {
  const updateChallenge = useUpdateChallenge();
  const [isPublic, setIsPublic] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');
  const [requirePhotoProof, setRequirePhotoProof] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (challenge && open) {
      setIsPublic(challenge.is_public || false);
      setPublicSlug(challenge.public_slug || '');
      setRequirePhotoProof(challenge.require_photo_proof || false);
    }
  }, [challenge, open]);

  const publicUrl = publicSlug 
    ? `${window.location.origin}/challenge/${publicSlug}`
    : '';

  const generateSlug = () => {
    const randomPart = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now().toString(36);
    setPublicSlug(`${randomPart}${timestamp}`);
  };

  useEffect(() => {
    if (isPublic && !publicSlug) {
      generateSlug();
    }
  }, [isPublic]);

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Odkaz zkopírován');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nepodařilo se zkopírovat odkaz');
    }
  };

  const openPublicPage = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  const handleSave = () => {
    if (!challenge) return;
    
    updateChallenge.mutate({
      id: challenge.id,
      is_public: isPublic,
      public_slug: isPublic ? publicSlug : null,
      require_photo_proof: requirePhotoProof,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        if (isPublic) {
          toast.success('Veřejná výzva aktivována');
        }
      }
    });
  };

  if (!challenge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Veřejné nastavení
          </DialogTitle>
          <DialogDescription>
            {challenge.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Public toggle */}
          <div className={`p-4 rounded-lg border ${isPublic ? 'border-green-500/50 bg-green-500/5' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className={`h-5 w-5 ${isPublic ? 'text-green-500' : 'text-muted-foreground'}`} />
                <div>
                  <Label className="text-base cursor-pointer">Veřejná výzva</Label>
                  <p className="text-xs text-muted-foreground">
                    Kdokoliv s odkazem se může zúčastnit
                  </p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>

          {isPublic && (
            <>
              {/* Public URL */}
              <div className="space-y-2">
                <Label className="text-xs">Veřejný odkaz</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={publicSlug}
                      onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="moje-vyzva"
                      className="pl-9 h-9 font-mono text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyLink}
                    disabled={!publicSlug}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openPublicPage}
                    disabled={!publicSlug}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                {publicUrl && (
                  <p className="text-xs text-muted-foreground break-all">
                    {publicUrl}
                  </p>
                )}
              </div>

              {/* Features badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="bg-background">
                  <Globe className="h-3 w-3 mr-1" />
                  Leaderboard
                </Badge>
                <Badge variant="outline" className="bg-background">
                  💬 Chat
                </Badge>
                <Badge variant="outline" className="bg-background">
                  📊 Statistiky
                </Badge>
                <Badge variant="outline" className="bg-background">
                  👤 Registrace hostů
                </Badge>
              </div>
            </>
          )}

          {/* Photo proof toggle */}
          <div className={`p-4 rounded-lg border ${requirePhotoProof ? 'border-purple-500/50 bg-purple-500/5' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className={`h-5 w-5 ${requirePhotoProof ? 'text-purple-500' : 'text-muted-foreground'}`} />
                <div>
                  <Label className="text-base cursor-pointer">Povinný foto důkaz</Label>
                  <p className="text-xs text-muted-foreground">
                    {requirePhotoProof 
                      ? 'Účastníci musí přiložit fotku'
                      : 'Fotky jsou volitelné'}
                  </p>
                </div>
              </div>
              <Switch checked={requirePhotoProof} onCheckedChange={setRequirePhotoProof} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={updateChallenge.isPending}>
            {updateChallenge.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
