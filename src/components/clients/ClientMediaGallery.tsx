import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  ChevronRight, 
  Plus,
  Mic,
  ImageIcon,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useClientMedia } from '@/hooks/useClientMedia';
import { PhotoUpload } from '@/components/media/PhotoUpload';
import { VoiceRecorder } from '@/components/media/VoiceRecorder';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientMediaGalleryProps {
  clientId: string;
  defaultOpen?: boolean;
}

export function ClientMediaGallery({ clientId, defaultOpen = false }: ClientMediaGalleryProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const { data: photos = [], isLoading: photosLoading } = useClientMedia(clientId, 'photo');
  const { data: audioNotes = [], isLoading: audioLoading } = useClientMedia(clientId, 'audio');

  const isLoading = photosLoading || audioLoading;
  const totalPhotos = photos.length;
  const totalAudio = audioNotes.length;
  const totalMedia = totalPhotos + totalAudio;

  // Get recent media (last 6 photos for preview)
  const recentPhotos = photos.slice(0, 6);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-6 bg-secondary/50 rounded w-32 mb-3" />
        <div className="h-20 bg-secondary/30 rounded" />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Média & fotky</p>
              <p className="text-sm text-muted-foreground">
                {totalMedia > 0 
                  ? `${totalPhotos} fotek • ${totalAudio} nahrávek`
                  : 'Žádná média'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalMedia > 0 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                {totalMedia}
              </Badge>
            )}
            <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 glass rounded-2xl space-y-4">
          {/* Quick actions */}
          <div className="flex gap-2">
            <PhotoUpload clientId={clientId} />
            <VoiceRecorder clientId={clientId} />
          </div>

          {totalMedia > 0 ? (
            <>
              {/* Photo grid preview */}
              {recentPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Poslední fotky</p>
                  <div className="grid grid-cols-3 gap-2">
                    {recentPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-xl bg-secondary/50 overflow-hidden relative group"
                      >
                        <img
                          src={photo.file_url}
                          alt={photo.description || 'Progress fotka'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white">
                            {format(new Date(photo.date), 'd.M.', { locale: cs })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio notes count */}
              {totalAudio > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{totalAudio} hlasových poznámek</span>
                  <Play className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              )}

              {/* View all button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1 text-xs"
                onClick={() => navigate(`/records/${clientId}?tab=media`)}
              >
                Zobrazit vše ({totalMedia})
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Zatím žádná média</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
