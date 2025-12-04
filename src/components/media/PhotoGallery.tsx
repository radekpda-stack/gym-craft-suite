import { useState } from "react";
import { ClientMedia, useDeleteMedia, useUpdateMedia, BODY_AREA_OPTIONS, CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ZoomIn, ZoomOut, RotateCw, Edit2, Trash2, X, Columns } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface PhotoGalleryProps {
  photos: ClientMedia[];
  onCompare?: (photos: ClientMedia[]) => void;
}

export function PhotoGallery({ photos, onCompare }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ClientMedia | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<ClientMedia | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedForCompare, setSelectedForCompare] = useState<ClientMedia[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const handleDelete = async (photo: ClientMedia) => {
    await deleteMedia.mutateAsync({ id: photo.id, fileUrl: photo.file_url, type: 'photo' });
    setSelectedPhoto(null);
  };

  const handleUpdate = async (photo: ClientMedia, updates: Partial<ClientMedia>) => {
    await updateMedia.mutateAsync({ id: photo.id, ...updates });
    setEditingPhoto(null);
  };

  const toggleCompareSelection = (photo: ClientMedia) => {
    if (selectedForCompare.find(p => p.id === photo.id)) {
      setSelectedForCompare(selectedForCompare.filter(p => p.id !== photo.id));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, photo]);
    }
  };

  const getCategoryLabel = (value: string) => CATEGORY_OPTIONS.find(o => o.value === value)?.label || value;
  const getBodyAreaLabel = (value: string | null) => value ? BODY_AREA_OPTIONS.find(o => o.value === value)?.label || value : null;

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Zatím žádné fotografie
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setCompareMode(!compareMode);
            setSelectedForCompare([]);
          }}
        >
          <Columns className="h-4 w-4 mr-2" />
          {compareMode ? "Zrušit srovnání" : "Srovnat fotky"}
        </Button>
        {compareMode && selectedForCompare.length === 2 && (
          <Button size="sm" onClick={() => onCompare?.(selectedForCompare)}>
            Zobrazit srovnání
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              compareMode && selectedForCompare.find(p => p.id === photo.id)
                ? "border-primary ring-2 ring-primary/50"
                : "border-transparent hover:border-border"
            }`}
            onClick={() => compareMode ? toggleCompareSelection(photo) : setSelectedPhoto(photo)}
          >
            <img
              src={photo.file_url}
              alt={photo.description || "Fotografie"}
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
              <p className="text-white text-xs truncate">{photo.description || "Bez popisku"}</p>
              <p className="text-white/70 text-xs">
                {format(new Date(photo.date), "d. M. yyyy", { locale: cs })}
              </p>
            </div>
            {compareMode && (
              <div className="absolute top-2 right-2">
                <div className={`w-6 h-6 rounded-full border-2 ${
                  selectedForCompare.find(p => p.id === photo.id)
                    ? "bg-primary border-primary"
                    : "border-white"
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => { setSelectedPhoto(null); setZoom(1); setRotation(0); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Náhled fotografie</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setRotation(r => (r + 90) % 360)}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditingPhoto(selectedPhoto)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
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
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg bg-muted flex items-center justify-center" style={{ height: "60vh" }}>
                <img
                  src={selectedPhoto.file_url}
                  alt={selectedPhoto.description || "Fotografie"}
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Datum</p>
                  <p>{format(new Date(selectedPhoto.date), "d. MMMM yyyy", { locale: cs })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kategorie</p>
                  <p>{getCategoryLabel(selectedPhoto.category)}</p>
                </div>
                {selectedPhoto.body_area && (
                  <div>
                    <p className="text-muted-foreground">Oblast těla</p>
                    <p>{getBodyAreaLabel(selectedPhoto.body_area)}</p>
                  </div>
                )}
                {selectedPhoto.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Popisek</p>
                    <p>{selectedPhoto.description}</p>
                  </div>
                )}
                {selectedPhoto.tags.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Tagy</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPhoto.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPhoto} onOpenChange={() => setEditingPhoto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit fotografii</DialogTitle>
          </DialogHeader>
          {editingPhoto && (
            <EditPhotoForm
              photo={editingPhoto}
              onSave={(updates) => handleUpdate(editingPhoto, updates)}
              onCancel={() => setEditingPhoto(null)}
              isLoading={updateMedia.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditPhotoFormProps {
  photo: ClientMedia;
  onSave: (updates: Partial<ClientMedia>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditPhotoForm({ photo, onSave, onCancel, isLoading }: EditPhotoFormProps) {
  const [description, setDescription] = useState(photo.description);
  const [category, setCategory] = useState(photo.category);
  const [bodyArea, setBodyArea] = useState(photo.body_area || "");
  const [tags, setTags] = useState(photo.tags.join(", "));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Kategorie</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Oblast těla</Label>
        <Select value={bodyArea} onValueChange={setBodyArea}>
          <SelectTrigger>
            <SelectValue placeholder="Vyberte oblast" />
          </SelectTrigger>
          <SelectContent>
            {BODY_AREA_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Popisek</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Tagy (oddělené čárkou)</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Zrušit</Button>
        <Button
          onClick={() => onSave({
            description,
            category,
            body_area: bodyArea || undefined,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          })}
          disabled={isLoading}
        >
          {isLoading ? "Ukládám..." : "Uložit"}
        </Button>
      </div>
    </div>
  );
}
