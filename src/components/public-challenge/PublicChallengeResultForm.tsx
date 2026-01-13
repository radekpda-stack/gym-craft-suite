import { useState, useRef } from 'react';
import { Trophy, Upload, Loader2, X, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubmitPublicResult, type MetricConfig } from '@/hooks/usePublicChallenge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  challengeId: string;
  metricsConfig: MetricConfig[];
  requirePhotoProof: boolean;
}

export default function PublicChallengeResultForm({ 
  challengeId, 
  metricsConfig, 
  requirePhotoProof 
}: Props) {
  const [metricsData, setMetricsData] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMutation = useSubmitPublicResult();

  const sortedMetrics = [...metricsConfig].sort((a, b) => a.order - b.order);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 photos
    if (photos.length + files.length > 5) {
      toast.error('Maximálně 5 fotek');
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of files) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          toast.error('Pouze obrázky jsou povoleny');
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Maximální velikost souboru je 10 MB');
          continue;
        }

        // Generate unique filename
        const ext = file.name.split('.').pop();
        const filename = `${challengeId}/${crypto.randomUUID()}.${ext}`;

        // Upload to storage
        const { data, error } = await supabase.storage
          .from('challenge-proofs')
          .upload(filename, file);

        if (error) {
          console.error('Upload error:', error);
          toast.error('Nahrávání selhalo');
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('challenge-proofs')
          .getPublicUrl(data.path);

        newUrls.push(publicUrl);
      }

      setPhotos(prev => [...prev, ...files.slice(0, 5 - prev.length)]);
      setPhotoUrls(prev => [...prev, ...newUrls]);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required metrics
    const parsedMetrics: Record<string, number> = {};
    for (const metric of sortedMetrics) {
      const value = metricsData[metric.key];
      
      if (metric.required && (!value || value.trim() === '')) {
        toast.error(`${metric.label} je povinné pole`);
        return;
      }

      if (value && value.trim() !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          toast.error(`${metric.label} musí být číslo`);
          return;
        }
        if (metric.min !== undefined && numValue < metric.min) {
          toast.error(`${metric.label} musí být minimálně ${metric.min}`);
          return;
        }
        if (metric.max !== undefined && numValue > metric.max) {
          toast.error(`${metric.label} musí být maximálně ${metric.max}`);
          return;
        }
        parsedMetrics[metric.key] = numValue;
      }
    }

    // Validate photo proof
    if (requirePhotoProof && photoUrls.length === 0) {
      toast.error('Tato výzva vyžaduje fotodůkaz');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        challenge_id: challengeId,
        metrics_data: parsedMetrics,
        photo_urls: photoUrls,
      });
      toast.success('Výsledek úspěšně odeslán!');
      // Reset form
      setMetricsData({});
      setPhotos([]);
      setPhotoUrls([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Odeslání selhalo');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Odeslat výsledek
        </CardTitle>
        <CardDescription>
          Vyplňte svůj výsledek
          {requirePhotoProof && ' a přiložte fotodůkaz'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Metrics inputs */}
          {sortedMetrics.map(metric => (
            <div key={metric.key} className="space-y-1.5">
              <Label htmlFor={metric.key}>
                {metric.label} ({metric.unit})
                {metric.required && ' *'}
              </Label>
              <Input
                id={metric.key}
                type="number"
                step={metric.type === 'integer' ? '1' : '0.01'}
                value={metricsData[metric.key] || ''}
                onChange={(e) => setMetricsData(d => ({ ...d, [metric.key]: e.target.value }))}
                placeholder={`Zadejte ${metric.label.toLowerCase()}`}
                min={metric.min}
                max={metric.max}
              />
              {(metric.min !== undefined || metric.max !== undefined) && (
                <p className="text-xs text-muted-foreground">
                  {metric.min !== undefined && `Min: ${metric.min}`}
                  {metric.min !== undefined && metric.max !== undefined && ' | '}
                  {metric.max !== undefined && `Max: ${metric.max}`}
                </p>
              )}
            </div>
          ))}

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>
              Fotodůkaz{requirePhotoProof ? ' *' : ' (volitelné)'}
            </Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img 
                      src={url} 
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || photoUrls.length >= 5}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Nahrávání...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  {photoUrls.length > 0 ? 'Přidat další fotku' : 'Vybrat fotku'}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              Max 5 fotek, každá max 10 MB. Fotky budou veřejně viditelné.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={submitMutation.isPending || isUploading}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Odesílám...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Odeslat výsledek
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
