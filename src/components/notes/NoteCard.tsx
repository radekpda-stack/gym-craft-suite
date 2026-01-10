import { memo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Pin, User, Image, Video, Mic, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrainerNote } from '@/hooks/useTrainerNotes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NoteCardProps {
  note: TrainerNote;
  onEdit: (note: TrainerNote) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (noteId: string, isPinned: boolean) => void;
  onClick?: (note: TrainerNote) => void;
}

export const NoteCard = memo(function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onClick,
}: NoteCardProps) {
  const mediaCount = note.media?.length || 0;
  const photoCount = note.media?.filter((m) => m.type === 'photo').length || 0;
  const videoCount = note.media?.filter((m) => m.type === 'video').length || 0;
  const audioCount = note.media?.filter((m) => m.type === 'audio').length || 0;

  const clientName = note.client?.name || null;

  // Truncate content for preview
  const contentPreview = note.content.length > 150 
    ? note.content.substring(0, 150) + '...' 
    : note.content;

  return (
    <div
      className={cn(
        'group relative bg-card border border-border/50 rounded-lg p-4 transition-all duration-200',
        'hover:border-border hover:shadow-md cursor-pointer',
        note.is_pinned && 'border-primary/30 bg-primary/5'
      )}
      onClick={() => onClick?.(note)}
    >
      {/* Pin indicator */}
      {note.is_pinned && (
        <div className="absolute -top-1.5 -right-1.5">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Pin className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {note.title ? (
            <h3 className="font-medium text-foreground truncate">{note.title}</h3>
          ) : (
            <h3 className="font-medium text-muted-foreground italic truncate">
              Bez názvu
            </h3>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{format(new Date(note.created_at), 'd.M.yyyy HH:mm', { locale: cs })}</span>
            {clientName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {clientName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(note); }}>
              <Pencil className="w-4 h-4 mr-2" />
              Upravit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(note.id, note.is_pinned); }}>
              <Pin className="w-4 h-4 mr-2" />
              {note.is_pinned ? 'Odepnout' : 'Připnout'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content preview */}
      <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
        {contentPreview}
      </p>

      {/* Media badges */}
      {mediaCount > 0 && (
        <div className="flex items-center gap-2 mt-3">
          {photoCount > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Image className="w-3 h-3" />
              {photoCount}
            </Badge>
          )}
          {videoCount > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Video className="w-3 h-3" />
              {videoCount}
            </Badge>
          )}
          {audioCount > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Mic className="w-3 h-3" />
              {audioCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
});
