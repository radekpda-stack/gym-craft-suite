import { useState } from "react";
import { ClientMedia, useDeleteMedia, useUpdateMedia } from "@/hooks/useClientMedia";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Video, Play, Trash2, Edit, Calendar, Tag, X } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface VideoGalleryProps {
  videos: ClientMedia[];
}

export function VideoGallery({ videos }: VideoGalleryProps) {
  const [selectedVideo, setSelectedVideo] = useState<ClientMedia | null>(null);
  const [editingVideo, setEditingVideo] = useState<ClientMedia | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");

  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const handleEdit = (video: ClientMedia) => {
    setEditingVideo(video);
    setEditDescription(video.description);
    setEditTags(video.tags.join(", "));
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;

    await updateMedia.mutateAsync({
      id: editingVideo.id,
      description: editDescription,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
    });

    setEditingVideo(null);
  };

  const handleDelete = async (video: ClientMedia) => {
    // Extract file path from URL for deletion
    const filePath = video.file_url.includes('/storage/v1/')
      ? video.file_url.split('/storage/v1/object/public/client-videos/')[1] || video.file_url
      : video.file_url;

    await deleteMedia.mutateAsync({
      id: video.id,
      fileUrl: filePath,
      type: 'video',
    });
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Žádná videa</p>
        <p className="text-sm">Nahrajte první video pomocí tlačítka výše</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="group relative bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedVideo(video)}
          >
            <div className="aspect-video bg-muted flex items-center justify-center relative">
              <Video className="h-8 w-8 text-muted-foreground" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-10 w-10 text-white" />
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(video.date), "d. M. yyyy", { locale: cs })}
              </p>
              {video.description && (
                <p className="text-sm mt-1 line-clamp-2">{video.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedVideo?.description || "Video"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedVideo) handleEdit(selectedVideo);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Smazat video?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tato akce je nevratná. Video bude trvale odstraněno.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (selectedVideo) {
                            handleDelete(selectedVideo);
                            setSelectedVideo(null);
                          }
                        }}
                      >
                        Smazat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedVideo && (
            <div className="space-y-4">
              <video
                src={selectedVideo.file_url}
                controls
                autoPlay
                className="w-full rounded-lg bg-black max-h-[60vh]"
              />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedVideo.date), "d. MMMM yyyy", { locale: cs })}
                </span>
              </div>
              {selectedVideo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedVideo.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Popis</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tagy</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Oddělené čárkou"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingVideo(null)}>
                Zrušit
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMedia.isPending}>
                Uložit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
