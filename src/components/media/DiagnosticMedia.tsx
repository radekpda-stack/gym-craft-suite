import { useClientMedia, ClientMedia } from "@/hooks/useClientMedia";
import { PhotoUpload } from "./PhotoUpload";
import { VoiceRecorder } from "./VoiceRecorder";
import { PhotoCompare } from "./PhotoCompare";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Camera, Mic, Play, Pause, ZoomIn, Trash2, Image, Volume2, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useState } from "react";
import { useDeleteMedia } from "@/hooks/useClientMedia";
import { Diagnostic } from "@/hooks/useDiagnostics";
import { featureTracker } from "@/hooks/useFeatureTracking";

interface DiagnosticMediaProps {
  clientId: string;
  diagnosticId: string;
  diagnostics?: Diagnostic[];
}

export function DiagnosticMedia({ clientId, diagnosticId, diagnostics = [] }: DiagnosticMediaProps) {
  const { data: media = [] } = useClientMedia(clientId, undefined, diagnosticId);
  const photos = media.filter(m => m.type === 'photo');
  const audioNotes = media.filter(m => m.type === 'audio');
  
  const [selectedPhoto, setSelectedPhoto] = useState<ClientMedia | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  
  const deleteMedia = useDeleteMedia();

  const handleToggleCompare = (photoId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      }
      if (prev.length < 2) {
        return [...prev, photoId];
      }
      return [prev[1], photoId];
    });
  };

  const photosForCompare = photos.filter(p => selectedForCompare.includes(p.id));

  const handlePlay = (note: ClientMedia) => {
    if (playingId === note.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(note.file_url);
      audio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };
      audio.play();
      setAudioElement(audio);
      setPlayingId(note.id);
    }
  };

  const handleDelete = async (item: ClientMedia) => {
    if (playingId === item.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    }
    await deleteMedia.mutateAsync({ id: item.id, fileUrl: item.file_url, type: item.type });
    setSelectedPhoto(null);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Image className="h-4 w-4" />
          <span>{photos.length} fotek</span>
          <span className="mx-2">•</span>
          <Volume2 className="h-4 w-4" />
          <span>{audioNotes.length} poznámek</span>
        </div>
        <div className="flex gap-2">
          <PhotoUpload 
            clientId={clientId} 
            diagnosticId={diagnosticId}
            diagnostics={diagnostics}
          />
          <VoiceRecorder 
            clientId={clientId} 
            diagnosticId={diagnosticId}
            diagnostics={diagnostics}
          />
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotografie
            </h4>
            {photos.length >= 2 && (
              <div className="flex items-center gap-2">
                {compareMode && selectedForCompare.length === 2 && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      featureTracker.track('photo_compare_open', 'media');
                      setCompareDialogOpen(true);
                    }}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Porovnat
                  </Button>
                )}
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!compareMode) {
                      featureTracker.track('photo_compare_mode_enter', 'media');
                    }
                    setCompareMode(!compareMode);
                    setSelectedForCompare([]);
                  }}
                >
                  {compareMode ? "Zrušit výběr" : "Porovnat fotky"}
                </Button>
              </div>
            )}
          </div>
          {compareMode && (
            <p className="text-xs text-muted-foreground">
              Vyberte 2 fotografie pro porovnání ({selectedForCompare.length}/2)
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative group cursor-pointer rounded-lg overflow-hidden aspect-square ${
                  compareMode && selectedForCompare.includes(photo.id) 
                    ? "ring-2 ring-primary" 
                    : ""
                }`}
                onClick={() => compareMode ? handleToggleCompare(photo.id) : setSelectedPhoto(photo)}
              >
                <img
                  src={photo.file_url}
                  alt={photo.description || "Foto"}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                {compareMode ? (
                  <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                    selectedForCompare.includes(photo.id) ? "bg-primary/30" : "bg-black/30"
                  }`}>
                    <Checkbox 
                      checked={selectedForCompare.includes(photo.id)}
                      className="h-6 w-6 border-2 border-white"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Notes */}
      {audioNotes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Hlasové poznámky
          </h4>
          <div className="space-y-2">
            {audioNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <Button
                  variant={playingId === note.id ? "default" : "outline"}
                  size="icon"
                  className="shrink-0 rounded-full h-8 w-8"
                  onClick={() => handlePlay(note)}
                >
                  {playingId === note.id ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{note.description || "Bez popisku"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(note.duration_seconds)}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Smazat poznámku?</AlertDialogTitle>
                      <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(note)}>Smazat</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Zatím žádná média k této diagnostice
        </p>
      )}

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Náhled fotografie</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Smazat fotografii?</AlertDialogTitle>
                    <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={() => selectedPhoto && handleDelete(selectedPhoto)}>
                      Smazat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.file_url}
                alt={selectedPhoto.description || "Fotografie"}
                loading="lazy"
                decoding="async"
                className="w-full max-h-[60vh] object-contain rounded-lg"
              />
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  {format(new Date(selectedPhoto.date), "d. MMMM yyyy", { locale: cs })}
                </p>
                {selectedPhoto.description && <p>{selectedPhoto.description}</p>}
                {selectedPhoto.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedPhoto.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Compare Dialog */}
      <PhotoCompare
        photos={photosForCompare}
        open={compareDialogOpen}
        onOpenChange={(open) => {
          setCompareDialogOpen(open);
          if (!open) {
            setCompareMode(false);
            setSelectedForCompare([]);
          }
        }}
      />
    </div>
  );
}
