import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Camera, Link2, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PublicChallengeSettingsSectionProps {
  isPublic: boolean;
  publicSlug: string;
  requirePhotoProof: boolean;
  onIsPublicChange: (value: boolean) => void;
  onPublicSlugChange: (value: string) => void;
  onRequirePhotoProofChange: (value: boolean) => void;
}

export function PublicChallengeSettingsSection({
  isPublic,
  publicSlug,
  requirePhotoProof,
  onIsPublicChange,
  onPublicSlugChange,
  onRequirePhotoProofChange,
}: PublicChallengeSettingsSectionProps) {
  const [copied, setCopied] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(isPublic);
  
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

  useEffect(() => {
    if (isPublic) {
      setSectionOpen(true);
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

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen} className="border-t pt-4 mt-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Globe className={`h-4 w-4 ${isPublic ? 'text-green-500' : ''}`} />
            {isPublic ? 'Veřejná výzva aktivní' : 'Veřejné nastavení (volitelné)'}
            {isPublic && (
              <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 border-green-500/30">
                Veřejná
              </Badge>
            )}
          </span>
          {sectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4 space-y-4">
        {/* Public toggle */}
        <div className={`p-4 rounded-lg border ${isPublic ? 'border-green-500/50 bg-green-500/5' : ''}`}>
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
            <div className="mt-4 pt-4 border-t space-y-3">
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
        </div>

        {/* Photo proof toggle */}
        <div className={`p-4 rounded-lg border ${requirePhotoProof ? 'border-purple-500/50 bg-purple-500/5' : ''}`}>
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
