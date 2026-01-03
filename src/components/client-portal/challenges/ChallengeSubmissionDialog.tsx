import { useState, useMemo, useRef } from 'react';
import { Trophy, Medal, Award, History, Info, Clock, Camera, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TimeInputSimple } from '@/components/ui/time-input-simple';
import { Input } from '@/components/ui/input';
import { formatChallengeScore, getMetricLabel } from '@/lib/challengeUtils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Submission {
  id: string;
  score_primary: number;
  submitted_at: string | null;
  status: string;
  media_urls?: string[] | null;
}

interface Challenge {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  primary_metric: string;
  unit_label?: string | null;
  scoring_type: string;
  allow_multiple_attempts?: boolean | null;
}

interface ChallengeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
  previousSubmissions: Submission[];
  onSubmit: (score: number, note?: string, mediaUrls?: string[]) => Promise<void>;
  isPending: boolean;
}

interface PendingFile {
  file: File;
  preview: string;
  type: 'photo' | 'video';
}

export function ChallengeSubmissionDialog({
  open,
  onOpenChange,
  challenge,
  previousSubmissions,
  onSubmit,
  isPending,
}: ChallengeSubmissionDialogProps) {
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [numericScore, setNumericScore] = useState('');
  const [note, setNote] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isTimeMetric = challenge?.primary_metric === 'time_seconds' || 
                       challenge?.primary_metric === 'time_ms';

  // Get best submission
  const bestSubmission = useMemo(() => {
    if (!previousSubmissions.length || !challenge) return null;
    const sorted = [...previousSubmissions].sort((a, b) => {
      if (challenge.scoring_type === 'time_lower_better') {
        return a.score_primary - b.score_primary;
      }
      return b.score_primary - a.score_primary;
    });
    return sorted[0];
  }, [previousSubmissions, challenge]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 3 - pendingFiles.filter(f => f.type === 'photo').length;
    const toAdd = Array.from(files).slice(0, remaining);

    const newFiles = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: 'photo' as const,
    }));

    setPendingFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const videoCount = pendingFiles.filter(f => f.type === 'video').length;
    if (videoCount >= 1) return;

    const file = files[0];
    if (file.size > 50 * 1024 * 1024) {
      alert('Video je příliš velké. Max 50MB.');
      return;
    }

    setPendingFiles(prev => [...prev, {
      file,
      preview: URL.createObjectURL(file),
      type: 'video',
    }]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (pendingFiles.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const uploadedUrls: string[] = [];

    for (const { file, type } of pendingFiles) {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
      const filePath = `${user.id}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('challenge-media')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('challenge-media')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!challenge) return;

    let score: number;
    if (isTimeMetric) {
      if (!timeMs) return;
      score = timeMs / 1000;
    } else {
      score = parseFloat(numericScore);
      if (isNaN(score) || score <= 0) return;
    }

    setUploading(true);
    try {
      const mediaUrls = await uploadFiles();
      await onSubmit(score, note || undefined, mediaUrls.length > 0 ? mediaUrls : undefined);
      
      // Reset form
      pendingFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setPendingFiles([]);
      setTimeMs(null);
      setNumericScore('');
      setNote('');
    } finally {
      setUploading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />;
    return null;
  };

  const isValid = isTimeMetric ? (timeMs !== null && timeMs > 0) : (numericScore && parseFloat(numericScore) > 0);

  if (!challenge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Odeslat výsledek
          </DialogTitle>
          <DialogDescription>
            {challenge.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Instructions */}
          {challenge.instructions && (
            <div className="p-3 rounded-lg bg-muted/50 border border-muted">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {challenge.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Best Score Display */}
          {bestSubmission && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Tvůj nejlepší výsledek</p>
              <p className="text-lg font-bold text-primary">
                {formatChallengeScore(bestSubmission.score_primary, challenge.primary_metric)}
                {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Score Input */}
          <div className="space-y-2">
            <Label>
              Výsledek
              {getMetricLabel(challenge.primary_metric, challenge.unit_label) && !isTimeMetric && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({getMetricLabel(challenge.primary_metric, challenge.unit_label)})
                </span>
              )}
            </Label>
            
            {isTimeMetric ? (
              <div className="flex justify-center py-2">
                <TimeInputSimple
                  value={timeMs}
                  onChange={setTimeMs}
                  showCentiseconds={true}
                />
              </div>
            ) : (
              <Input
                type="number"
                value={numericScore}
                onChange={(e) => setNumericScore(e.target.value)}
                placeholder="Zadej hodnotu"
                className="text-lg"
              />
            )}
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Přidat důkaz (volitelné)</Label>
            <div className="flex items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={pendingFiles.filter(f => f.type === 'photo').length >= 3}
              >
                <Camera className="h-4 w-4 mr-2" />
                Fotka ({pendingFiles.filter(f => f.type === 'photo').length}/3)
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                disabled={pendingFiles.filter(f => f.type === 'video').length >= 1}
              >
                <Video className="h-4 w-4 mr-2" />
                Video ({pendingFiles.filter(f => f.type === 'video').length}/1)
              </Button>
            </div>

            {pendingFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-2">
                {pendingFiles.map((item, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {item.type === 'photo' ? (
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.preview} className="w-full h-full object-cover" muted />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {item.type === 'video' && (
                      <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/50 rounded text-[9px] text-white">
                        VIDEO
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Poznámka (volitelné)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jak se ti dařilo? Jaké podmínky?"
              rows={2}
            />
          </div>

          {/* Previous Attempts */}
          {previousSubmissions.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="attempts" className="border-none">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-4 w-4" />
                    Moje předchozí pokusy ({previousSubmissions.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {previousSubmissions
                      .sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime())
                      .slice(0, 5)
                      .map((sub, index) => {
                        const isBest = bestSubmission?.id === sub.id;
                        return (
                          <div 
                            key={sub.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg",
                              isBest ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isBest && <Trophy className="h-3 w-3 text-amber-500" />}
                              <span className="text-sm font-medium">
                                {formatChallengeScore(sub.score_primary, challenge.primary_metric)}
                                {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {sub.submitted_at && format(new Date(sub.submitted_at), 'd. M.', { locale: cs })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading || isPending}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending || uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Nahrávám...
              </>
            ) : isPending ? 'Odesílám...' : 'Odeslat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
