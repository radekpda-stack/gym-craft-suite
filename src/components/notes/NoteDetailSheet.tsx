import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { User, Pin, Pencil, Trash2, X, Image, Video, Mic, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrainerNote, useTrainerNoteMedia } from '@/hooks/useTrainerNotes';
import { cn } from '@/lib/utils';

interface NoteDetailSheetProps {
  note: TrainerNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (note: TrainerNote) => void;
  onDelete: (noteId: string) => void;
}

export function NoteDetailSheet({
  note,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: NoteDetailSheetProps) {
  const { data: media = [] } = useTrainerNoteMedia(note?.id);

  if (!note) return null;

  const clientName = note.client?.name || null;

  const photoMedia = media.filter((m) => m.type === 'photo');
  const videoMedia = media.filter((m) => m.type === 'video');
  const audioMedia = media.filter((m) => m.type === 'audio');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left">
                {note.title || (
                  <span className="text-muted-foreground italic">Bez názvu</span>
                )}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>
                  {format(new Date(note.created_at), "d. MMMM yyyy 'v' HH:mm", { locale: cs })}
                </span>
                {note.is_pinned && (
                  <Badge variant="secondary" className="gap-1">
                    <Pin className="w-3 h-3" />
                    Připnuto
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Client info */}
          {clientName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{clientName}</span>
            </div>
          )}
        </SheetHeader>

        <Separator className="my-4" />

        {/* Content */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Poznámka</h4>
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {note.content}
            </div>
          </div>

          {/* Photos */}
          {photoMedia.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Fotografie ({photoMedia.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {photoMedia.map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                  >
                    <img
                      src={m.url}
                      alt={m.file_name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videoMedia.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videa ({videoMedia.length})
              </h4>
              <div className="space-y-2">
                {videoMedia.map((m) => (
                  <video
                    key={m.id}
                    src={m.url}
                    controls
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Audio */}
          {audioMedia.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Nahrávky ({audioMedia.length})
              </h4>
              <div className="space-y-2">
                {audioMedia.map((m) => (
                  <audio
                    key={m.id}
                    src={m.url}
                    controls
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onEdit(note)}>
            <Pencil className="w-4 h-4 mr-2" />
            Upravit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(note.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
