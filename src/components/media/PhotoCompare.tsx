import { useState } from "react";
import { ClientMedia } from "@/hooks/useClientMedia";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface PhotoCompareProps {
  photos: ClientMedia[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoCompare({ photos, open, onOpenChange }: PhotoCompareProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation1, setRotation1] = useState(0);
  const [rotation2, setRotation2] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider'>('side-by-side');

  if (photos.length !== 2) return null;

  const [photo1, photo2] = photos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Srovnání fotografií</span>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
              >
                Vedle sebe
              </Button>
              <Button
                variant={viewMode === 'slider' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('slider')}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Posuvník
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-2 gap-4 h-full">
              <PhotoPanel
                photo={photo1}
                zoom={zoom}
                rotation={rotation1}
                onRotate={() => setRotation1(r => (r + 90) % 360)}
              />
              <PhotoPanel
                photo={photo2}
                zoom={zoom}
                rotation={rotation2}
                onRotate={() => setRotation2(r => (r + 90) % 360)}
              />
            </div>
          ) : (
            <div className="relative h-full">
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <img
                  src={photo2.file_url}
                  alt={photo2.description || "Foto 2"}
                  className="w-full h-full object-contain"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>
              <div
                className="absolute inset-0 overflow-hidden rounded-lg"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={photo1.file_url}
                  alt={photo1.description || "Foto 1"}
                  className="w-full h-full object-contain"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                style={{ left: `${sliderPosition}%` }}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 bg-background/80 backdrop-blur-sm rounded-lg p-4">
                <Slider
                  value={[sliderPosition]}
                  onValueChange={([v]) => setSliderPosition(v)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-sm">
                {format(new Date(photo1.date), "d. M. yyyy", { locale: cs })}
              </div>
              <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-sm">
                {format(new Date(photo2.date), "d. M. yyyy", { locale: cs })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PhotoPanelProps {
  photo: ClientMedia;
  zoom: number;
  rotation: number;
  onRotate: () => void;
}

function PhotoPanel({ photo, zoom, rotation, onRotate }: PhotoPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm">
          <span className="font-medium">{format(new Date(photo.date), "d. MMMM yyyy", { locale: cs })}</span>
          {photo.description && (
            <span className="text-muted-foreground ml-2">• {photo.description}</span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
        <img
          src={photo.file_url}
          alt={photo.description || "Fotografie"}
          className="max-w-full max-h-full object-contain transition-transform"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
        />
      </div>
    </div>
  );
}
