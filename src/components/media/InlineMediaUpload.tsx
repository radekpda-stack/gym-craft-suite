import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Mic, X, Play, Pause, Square, Upload, Image, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeSimple } from "@/lib/timeUtils";

interface PendingMedia {
  id: string;
  type: 'photo' | 'audio';
  file: File;
  preview?: string;
}

interface InlineMediaUploadProps {
  pendingMedia: PendingMedia[];
  onAddMedia: (media: PendingMedia) => void;
  onRemoveMedia: (id: string) => void;
  disabled?: boolean;
}

export function InlineMediaUpload({ 
  pendingMedia, 
  onAddMedia, 
  onRemoveMedia,
  disabled 
}: InlineMediaUploadProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        onAddMedia({
          id: crypto.randomUUID(),
          type: 'photo',
          file,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        
        onAddMedia({
          id: crypto.randomUUID(),
          type: 'audio',
          file,
          preview: URL.createObjectURL(blob),
        });

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = formatTimeSimple;

  const photos = pendingMedia.filter(m => m.type === 'photo');
  const audios = pendingMedia.filter(m => m.type === 'audio');

  return (
    <div className="space-y-4">
      {/* Upload Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="gap-2"
        >
          <Camera className="w-4 h-4" />
          Přidat fotku
        </Button>
        
        {!isRecording ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={disabled}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Nahrát poznámku
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-2"
          >
            <Square className="w-4 h-4" />
            Zastavit ({formatTime(recordingTime)})
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotoSelect}
        />
      </div>

      {/* Preview Grid */}
      {pendingMedia.length > 0 && (
        <div className="space-y-3">
          {/* Photos */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((media) => (
                <div key={media.id} className="relative aspect-square">
                  <img
                    src={media.preview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => onRemoveMedia(media.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Audio */}
          {audios.length > 0 && (
            <div className="space-y-2">
              {audios.map((media) => (
                <div 
                  key={media.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <Mic className="w-4 h-4 text-primary" />
                  </div>
                  <audio 
                    src={media.preview} 
                    controls 
                    className="flex-1 h-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onRemoveMedia(media.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {pendingMedia.length} {pendingMedia.length === 1 ? 'soubor' : pendingMedia.length < 5 ? 'soubory' : 'souborů'} k nahrání
          </p>
        </div>
      )}
    </div>
  );
}

export type { PendingMedia };
