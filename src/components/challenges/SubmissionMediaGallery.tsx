import { useState } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SubmissionMediaGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrls: string[];
  clientName: string;
  score: string;
}

export function SubmissionMediaGallery({
  open,
  onOpenChange,
  mediaUrls,
  clientName,
  score,
}: SubmissionMediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const currentUrl = mediaUrls[currentIndex];
  const isVideo = currentUrl.match(/\.(mp4|webm|mov|avi)$/i);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-${currentIndex + 1}${isVideo ? '.mp4' : '.jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isVideo ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
            Média od {clientName}
          </DialogTitle>
          <DialogDescription>
            Výsledek: {score} • {currentIndex + 1} / {mediaUrls.length}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* Main media display */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {isVideo ? (
              <video
                src={currentUrl}
                controls
                className="max-w-full max-h-full"
                autoPlay
              />
            ) : (
              <img
                src={currentUrl}
                alt={`Média od ${clientName} - ${currentIndex + 1} z ${mediaUrls.length}`}
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Navigation arrows */}
          {mediaUrls.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={goPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={goNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {mediaUrls.length > 1 && (
          <div className="flex gap-2 justify-center overflow-x-auto py-2">
            {mediaUrls.map((url, index) => {
              const isThumbVideo = url.match(/\.(mp4|webm|mov|avi)$/i);
              return (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                    index === currentIndex ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  {isThumbVideo ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Náhled ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Stáhnout
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
