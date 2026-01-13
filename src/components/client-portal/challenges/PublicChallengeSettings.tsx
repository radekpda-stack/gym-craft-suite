import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Camera, Link2, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PublicChallengeSettingsProps {
  isPublic: boolean;
  publicSlug: string;
  requirePhotoProof: boolean;
  onIsPublicChange: (value: boolean) => void;
  onPublicSlugChange: (value: string) => void;
  onRequirePhotoProofChange: (value: boolean) => void;
}

export function PublicChallengeSettings({
  isPublic,
  publicSlug,
  requirePhotoProof,
  onIsPublicChange,
  onPublicSlugChange,
  onRequirePhotoProofChange,
}: PublicChallengeSettingsProps) {
  const [copied, setCopied] = useState(false);
  
  const publicUrl = publicSlug 
    ? `${window.location.origin}/challenge/${publicSlug}`
    : '';

  const generateSlug = () => {
    const randomPart = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now().toString(36);
    onPublicSlugChange(`${randomPart}${timestamp}`);
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

  return (
    <div className="space-y-4">
      <Card className={isPublic ? 'border-green-500/50 bg-green-500/5' : ''}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className={`h-5 w-5 ${isPublic ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <Label className="text-base cursor-pointer">Veřejná výzva</Label>
                <p className="text-xs text-muted-foreground">
                  Kdokoliv s odkazem se může zaregistrovat a zúčastnit
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={onIsPublicChange} />
          </div>

          {isPublic && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <Label className="text-xs">Veřejný odkaz</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={publicSlug}
                      onChange={(e) => onPublicSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
                </div>
                {publicUrl && (
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {publicUrl}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="bg-background">
                  <Globe className="h-3 w-3 mr-1" />
                  Veřejný leaderboard
                </Badge>
                <Badge variant="outline" className="bg-background">
                  💬 Veřejný chat
                </Badge>
                <Badge variant="outline" className="bg-background">
                  📊 Statistiky
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={requirePhotoProof ? 'border-purple-500/50 bg-purple-500/5' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className={`h-5 w-5 ${requirePhotoProof ? 'text-purple-500' : 'text-muted-foreground'}`} />
              <div>
                <Label className="text-base cursor-pointer">Povinný foto důkaz</Label>
                <p className="text-xs text-muted-foreground">
                  {requirePhotoProof 
                    ? 'Účastníci musí přiložit fotku jako důkaz výsledku'
                    : 'Fotky jsou volitelné (doporučené)'}
                </p>
              </div>
            </div>
            <Switch checked={requirePhotoProof} onCheckedChange={onRequirePhotoProofChange} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
